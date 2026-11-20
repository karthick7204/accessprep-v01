#!/usr/bin/env python3
"""
ACCESSPREP-X safe mathematical processing engine (SymPy).

SECURITY MODEL
- Reads ONE JSON request from stdin. Never evaluates strings: no eval/exec/sympify/parse_expr.
- Expressions arrive as an AST already produced by the TypeScript grammar; this script rebuilds SymPy
  objects through a strict whitelist walker (node types, operators, functions, variable names).
- Hard limits on node count, depth and numeric magnitude.

Operations: evaluate | simplify | solve | equivalent | lcm | hcf
"""
import json
import sys

MAX_NODES = 150
MAX_DEPTH = 30
MAX_ABS_EXPONENT = 1000
ALLOWED_VARS = set("abcdklmnpqrstuvwxyz")
ALLOWED_FUNCS = {"sqrt", "cbrt", "abs", "factorial", "sum", "lcm", "hcf", "gcd"}
ALLOWED_BIN = {"+", "-", "*", "/", ":", "^", "%_of", "of", "=", "!=", ">", "<", ">=", "<="}


class MathError(Exception):
    pass


try:
    import sympy as sp
except Exception:  # pragma: no cover
    print(json.dumps({"success": False, "error": "sympy_unavailable"}))
    sys.exit(0)


def build(node, state, depth=1):
    state["n"] += 1
    if state["n"] > MAX_NODES or depth > MAX_DEPTH:
        raise MathError("Expression too complex")
    if not isinstance(node, dict) or "type" not in node:
        raise MathError("Malformed node")
    t = node["type"]
    if t == "number":
        raw = str(node.get("raw", node.get("value")))
        try:
            val = sp.Rational(raw)
        except Exception:
            raise MathError("Bad number")
        if abs(val) > 10**15:
            raise MathError("Number too large")
        return val / 100 if node.get("isPercentage") else val
    if t == "variable":
        name = node.get("name", "")
        if name not in ALLOWED_VARS or len(name) != 1:
            raise MathError("Variable not allowed")
        return sp.Symbol(name, real=True)
    if t == "constant":
        if node.get("name") == "pi":
            return sp.pi
        if node.get("name") == "infinity":
            return sp.oo
        raise MathError("Constant not allowed")
    if t == "unary":
        v = build(node["operand"], state, depth + 1)
        op = node.get("operator")
        if op == "-":
            return -v
        if op == "+":
            return v
        if op == "percent":
            return v / 100
        if op == "factorial":
            if not (v.is_Integer and 0 <= v <= 170):
                raise MathError("Factorial needs integer 0..170")
            return sp.factorial(v)
        raise MathError("Unary op not allowed")
    if t == "function":
        name = node.get("name")
        if name not in ALLOWED_FUNCS:
            raise MathError("Function not allowed")
        args = [build(a, state, depth + 1) for a in node.get("args", [])]
        if not args:
            raise MathError("Function needs arguments")
        if name == "sqrt":
            return sp.sqrt(args[0])
        if name == "cbrt":
            return sp.real_root(args[0], 3)
        if name == "abs":
            return sp.Abs(args[0])
        if name == "factorial":
            if not (args[0].is_Integer and 0 <= args[0] <= 170):
                raise MathError("Factorial needs integer 0..170")
            return sp.factorial(args[0])
        if name == "sum":
            return sp.Add(*args)
        ints = []
        for a in args:
            if not a.is_Integer:
                raise MathError("LCM/HCF need integers")
            ints.append(int(a))
        if name in ("hcf", "gcd"):
            return sp.Integer(sp.igcd(*ints))
        return sp.Integer(sp.ilcm(*ints))
    if t == "binary":
        op = node.get("operator")
        if op not in ALLOWED_BIN:
            raise MathError("Operator not allowed")
        l = build(node["left"], state, depth + 1)
        r = build(node["right"], state, depth + 1)
        if op == "+":
            return l + r
        if op == "-":
            return l - r
        if op in ("*", "of"):
            return l * r
        if op in ("/", ":"):
            if r == 0:
                raise MathError("Division by zero")
            return l / r
        if op == "%_of":
            return (l / 100) * r
        if op == "^":
            if r.is_number and abs(r) > MAX_ABS_EXPONENT:
                raise MathError("Exponent too large")
            return l ** r
        rel = {"=": sp.Eq, "!=": sp.Ne, ">": sp.Gt, "<": sp.Lt, ">=": sp.Ge, "<=": sp.Le}[op]
        return rel(l, r)
    raise MathError("Node type not allowed")


def fmt(expr):
    return str(expr).replace("**", "^")


def op_evaluate(req):
    e = build(req["ast"], {"n": 0})
    if isinstance(e, sp.logic.boolalg.BooleanAtom):
        return {"text": str(bool(e)).lower(), "numeric": 1.0 if e else 0.0, "fraction": None}
    s = sp.nsimplify(sp.simplify(e)) if not e.free_symbols else sp.simplify(e)
    num = None
    frac = None
    if not s.free_symbols:
        n = sp.N(s)
        if n.is_real:
            num = float(n)
        if s.is_Rational:
            frac = str(s)
    return {"text": fmt(s), "numeric": num, "fraction": frac}


def op_simplify(req):
    e = build(req["ast"], {"n": 0})
    return {"text": fmt(sp.simplify(sp.expand(e))), "numeric": None, "fraction": None}


def op_solve(req):
    e = build(req["ast"], {"n": 0})
    if not isinstance(e, sp.Eq):
        raise MathError("Solve needs an equation")
    syms = sorted(e.free_symbols, key=lambda s: s.name)
    if len(syms) != 1:
        raise MathError("Solve supports one variable")
    sols = sp.solve(e, syms[0])
    real = [s for s in sols if s.is_real is not False]
    return {"variable": syms[0].name, "solutions": [fmt(s) for s in real], "numeric": [float(sp.N(s)) for s in real]}


def op_equivalent(req):
    a = build(req["ast"], {"n": 0})
    b = build(req["ast2"], {"n": 0})
    if isinstance(a, sp.Eq) and isinstance(b, sp.Eq):
        sa, sb = sorted(a.free_symbols, key=lambda s: s.name), sorted(b.free_symbols, key=lambda s: s.name)
        if sa == sb and len(sa) == 1:
            return {"equivalent": set(sp.solve(a, sa[0])) == set(sp.solve(b, sb[0]))}
        return {"equivalent": False}
    if isinstance(a, sp.Eq) or isinstance(b, sp.Eq):
        return {"equivalent": False}
    return {"equivalent": bool(sp.simplify(sp.expand(a - b)) == 0)}


OPS = {"evaluate": op_evaluate, "simplify": op_simplify, "solve": op_solve, "equivalent": op_equivalent,
       "lcm": op_evaluate, "hcf": op_evaluate}


def main():
    try:
        raw = sys.stdin.read(200000)
        req = json.loads(raw)
        if not isinstance(req, dict) or req.get("op") not in OPS:
            raise MathError("Unsupported operation")
        out = OPS[req["op"]](req)
        out["success"] = True
        out["engine"] = "sympy"
        print(json.dumps(out))
    except MathError as e:
        print(json.dumps({"success": False, "error": str(e), "engine": "sympy"}))
    except Exception as e:  # never leak internals / tracebacks
        print(json.dumps({"success": False, "error": "Could not process expression", "engine": "sympy"}))


if __name__ == "__main__":
    main()
