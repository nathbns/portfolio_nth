#!/usr/bin/env python3
"""TD5 Compilation (Ensimag 2A), exercices 1 et 2 : vérification de la correction.

Ce que fait ce script (bibliothèque standard seulement) :
  1. leaders, blocs de base et arcs du CFG d'un listing 3 adresses, avec la règle du
     cours (CM8, diapo 53 du PDF compil-cm06-cm08) :
        règle 1 : la première instruction est un leader ;
        règle 2 : toute cible d'un saut (conditionnel ou non) est un leader ;
        règle 3 : toute instruction qui suit immédiatement un saut est un leader ;
  2. un interprète du RISC-V « à temporaires » (li, mv, add, addi, sub, mul, bge, blt,
     beq, bne, j, labels, call println_int) ;
  3. la vivacité (liveness) des temporaires sur le CFG, et le graphe d'interférence ;
  4. un mini générateur de code 3 adresses qui applique les règles du cours (CM7,
     diapos 24 à 28 ; règles recopiées dans le corrigé du TD4) au programme MiniC
     proposé pour l'exercice 1 et à celui de l'exercice 2, pour vérifier que l'on
     retrouve exactement le listing de l'énoncé et le code proposé.

Usage : python3 -I cfg.py > out-ex12.txt
"""

from itertools import product

# --------------------------------------------------------------------------------------
# Les listings
# --------------------------------------------------------------------------------------

# Exercice 1 : recopié de l'énoncé, mêmes numéros de lignes (1 et 2 = commentaires).
EX1 = """\
##Automatically generated RISCXX code
##non executable 3-Address instructions version
        li temp_2, 1
        mv temp_0, temp_2
        li temp_3, 7
        mv temp_1, temp_3
lbl_begin_while_1_main:
        li temp_4, 0
        bge temp_0, temp_1, lbl_end_relational_3_main
        li temp_4, 1
lbl_end_relational_3_main:
        beq temp_4, zero, lbl_end_while_2_main
        li temp_5, 1
        add temp_6, temp_0, temp_5
        mv temp_0, temp_6
        j lbl_begin_while_1_main
lbl_end_while_2_main:
        mv a0, temp_0
        call println_int
"""

# Exercice 2 : code proposé (écrit à la main ; comparé plus bas à la sortie du générateur).
EX2 = """\
        li temp_1, 0
        mv temp_0, temp_1
lbl_begin_while_1_main:
        li temp_3, 4
        li temp_2, 0
        bge temp_0, temp_3, lbl_end_relational_3_main
        li temp_2, 1
lbl_end_relational_3_main:
        beq temp_2, zero, lbl_end_while_2_main
        li temp_4, 1
        add temp_5, temp_0, temp_4
        mv temp_0, temp_5
        j lbl_begin_while_1_main
lbl_end_while_2_main:
"""

# Variante optimisée de l'exercice 1 : le bloc du corps de boucle (lignes 13-15)
# remplacé par une seule instruction addi (optimisation locale, à l'intérieur du bloc).
EX1_OPT = EX1.replace(
    "        li temp_5, 1\n        add temp_6, temp_0, temp_5\n        mv temp_0, temp_6\n",
    "        addi temp_0, temp_0, 1\n",
)

BRANCHES = {"bge": ">=", "blt": "<", "beq": "==", "bne": "!="}
NEG = {"bge": "<", "blt": ">=", "beq": "!=", "bne": "=="}
JUMPS = set(BRANCHES) | {"j"}


# --------------------------------------------------------------------------------------
# Analyse du listing
# --------------------------------------------------------------------------------------

def parse(text):
    """Liste des lignes utiles (labels et instructions), avec leur numéro dans le listing."""
    code = []
    for n, raw in enumerate(text.splitlines(), 1):
        s = raw.split("#")[0].strip()
        if not s:
            continue  # ligne vide ou commentaire
        if s.endswith(":"):
            code.append({"line": n, "kind": "label", "name": s[:-1], "text": s})
            continue
        op, _, rest = s.partition(" ")
        args = [a.strip() for a in rest.split(",")] if rest.strip() else []
        code.append({"line": n, "kind": "instr", "op": op, "args": args, "text": s})
    return code


def is_jump(it):
    return it["kind"] == "instr" and it["op"] in JUMPS


def target(it):
    return it["args"][-1]


def label_index(code):
    return {it["name"]: i for i, it in enumerate(code) if it["kind"] == "label"}


def find_leaders(code, call_ends_block=False):
    """{indice : [raisons]} avec les trois règles de la diapo 53."""
    lab = label_index(code)
    reasons = {0: ["règle 1 : première instruction du code"]}
    for i, it in enumerate(code):
        if is_jump(it):
            t = lab[target(it)]
            reasons.setdefault(t, []).append(
                f"règle 2 : cible du « {it['op']} » de la ligne {it['line']}")
        ends = is_jump(it) or (call_ends_block and it["kind"] == "instr" and it["op"] == "call")
        if ends and i + 1 < len(code):
            reasons.setdefault(i + 1, []).append(
                f"règle 3 : suit le « {it['op']} » de la ligne {it['line']}")
    return dict(sorted(reasons.items()))


def blocks_of(code, leaders):
    starts = sorted(leaders)
    return [(s, (starts[k + 1] - 1) if k + 1 < len(starts) else len(code) - 1)
            for k, s in enumerate(starts)]


def cfg_edges(code, blocks):
    """Liste (source, destination, étiquette) ; 'EXIT' = sortie du programme."""
    lab = label_index(code)
    start_to_b = {s: k for k, (s, _) in enumerate(blocks)}
    edges = []
    for k, (s, e) in enumerate(blocks):
        last = code[e]
        nxt = k + 1 if k + 1 < len(blocks) else "EXIT"
        if last["kind"] == "instr" and last["op"] == "j":
            edges.append((k, start_to_b[lab[target(last)]], "j : toujours"))
        elif last["kind"] == "instr" and last["op"] in BRANCHES:
            a, b, _ = last["args"]
            op = last["op"]
            edges.append((k, nxt, f"saut non pris : {a} {NEG[op]} {b}"))
            edges.append((k, start_to_b[lab[target(last)]], f"saut pris : {a} {BRANCHES[op]} {b}"))
        else:
            edges.append((k, nxt, "en séquence (fall-through)"))
    return edges


def bname(k):
    return k if k == "EXIT" else f"B{k + 1}"


# --------------------------------------------------------------------------------------
# Interprète
# --------------------------------------------------------------------------------------

def run(code, blocks, max_steps=10_000):
    lab = label_index(code)
    block_at = {s: k for k, (s, _) in enumerate(blocks)}
    regs, out, trace = {}, [], []
    counts = [0] * len(blocks)
    pc = steps = 0

    def val(r):
        if r == "zero":
            return 0
        if r not in regs:
            raise RuntimeError(f"{r} lu avant d'être écrit (ligne {code[pc]['line']})")
        return regs[r]

    while pc < len(code):
        if pc in block_at:
            counts[block_at[pc]] += 1
        it = code[pc]
        if it["kind"] == "label":
            pc += 1
            continue
        steps += 1
        if steps > max_steps:
            raise RuntimeError("trop d'instructions : boucle infinie ?")
        op, a = it["op"], it["args"]
        if op == "li":
            regs[a[0]] = int(a[1])
        elif op == "mv":
            regs[a[0]] = val(a[1])
        elif op == "add":
            regs[a[0]] = val(a[1]) + val(a[2])
        elif op == "sub":
            regs[a[0]] = val(a[1]) - val(a[2])
        elif op == "mul":
            regs[a[0]] = val(a[1]) * val(a[2])
        elif op == "addi":
            regs[a[0]] = val(a[1]) + int(a[2])
        elif op in BRANCHES:
            x, y = val(a[0]), val(a[1])
            taken = {"bge": x >= y, "blt": x < y, "beq": x == y, "bne": x != y}[op]
            trace.append((it["line"], op, a[0], x, a[1], y, taken))
            pc = lab[a[2]] if taken else pc + 1
            continue
        elif op == "j":
            pc = lab[a[0]]
            continue
        elif op == "call":
            if a[0] != "println_int":
                raise RuntimeError(f"fonction inconnue {a[0]}")
            out.append(val("a0"))
        else:
            raise RuntimeError(f"instruction inconnue : {it['text']}")
        pc += 1
    return regs, out, steps, counts, trace


# --------------------------------------------------------------------------------------
# Vivacité (liveness) et interférences
# --------------------------------------------------------------------------------------

def use_def(it):
    if it["kind"] == "label":
        return set(), set()
    op, a = it["op"], it["args"]
    if op == "li":
        u, d = set(), {a[0]}
    elif op in ("mv", "addi"):
        u, d = {a[1]}, {a[0]}
    elif op in ("add", "sub", "mul"):
        u, d = {a[1], a[2]}, {a[0]}
    elif op in BRANCHES:
        u, d = {a[0], a[1]}, set()
    elif op == "j":
        u, d = set(), set()
    elif op == "call":
        u, d = {"a0"}, set()
    else:
        raise RuntimeError(op)
    return u - {"zero"}, d


def liveness(code, blocks, edges):
    succ = {k: [] for k in range(len(blocks))}
    for s, d, _ in edges:
        if d != "EXIT":
            succ[s].append(d)
    live_in = {k: set() for k in succ}
    live_out = {k: set() for k in succ}
    changed = True
    while changed:
        changed = False
        for k in reversed(range(len(blocks))):
            out = set().union(*(live_in[d] for d in succ[k])) if succ[k] else set()
            live = set(out)
            s, e = blocks[k]
            for i in range(e, s - 1, -1):
                u, d = use_def(code[i])
                live = (live - d) | u
            if out != live_out[k] or live != live_in[k]:
                live_out[k], live_in[k], changed = out, live, True
    # vivants AVANT et APRÈS chaque ligne
    before, after = {}, {}
    for k, (s, e) in enumerate(blocks):
        live = set(live_out[k])
        for i in range(e, s - 1, -1):
            after[i] = set(live)
            u, d = use_def(code[i])
            live = (live - d) | u
            before[i] = set(live)
    return live_in, live_out, before, after


def interference(code, after):
    temps = sorted({r for it in code for r in set().union(*use_def(it)) if r.startswith("temp_")},
                   key=lambda t: int(t.split("_")[1]))
    inter = set()
    for i, it in enumerate(code):
        _, d = use_def(it)
        for x in d:
            for y in after.get(i, set()):
                if x != y and x.startswith("temp_") and y.startswith("temp_"):
                    inter.add(tuple(sorted((x, y), key=lambda t: int(t.split("_")[1]))))
    return temps, sorted(inter, key=lambda p: (int(p[0][5:]), int(p[1][5:])))


def min_colors(temps, inter):
    for k in range(1, len(temps) + 1):
        for col in product(range(k), repeat=len(temps)):
            c = dict(zip(temps, col))
            if all(c[a] != c[b] for a, b in inter):
                return k, c
    return len(temps), {}


# --------------------------------------------------------------------------------------
# Mini générateur de code 3 adresses (règles du cours, CM7 diapos 24-28 / TD4)
# --------------------------------------------------------------------------------------

class Gen:
    """dest_first=True : dans e1 < e2, dest <- fresh_tmp() AVANT les opérandes (diapo 25)."""

    def __init__(self, dest_first=True, first_label=1):
        self.ntmp, self.nlbl, self.code, self.sym = 0, first_label, [], {}
        self.dest_first = dest_first

    def fresh_tmp(self):
        self.ntmp += 1
        return f"temp_{self.ntmp - 1}"

    def fresh_label(self, role):
        self.nlbl += 1
        return f"lbl_{role}_{self.nlbl - 1}_main"

    def emit(self, s):
        self.code.append("        " + s)

    def label(self, l):
        self.code.append(l + ":")

    def decl(self, names):
        for x in names:  # un temporaire neuf par variable, pas de code (comme l'énoncé)
            self.sym[x] = self.fresh_tmp()

    def expr(self, e):
        k = e[0]
        if k == "cst":
            d = self.fresh_tmp()
            self.emit(f"li {d}, {e[1]}")
            return d
        if k == "var":
            return self.sym[e[1]]
        if k == "+":
            t1, t2 = self.expr(e[1]), self.expr(e[2])
            d = self.fresh_tmp()
            self.emit(f"add {d}, {t1}, {t2}")
            return d
        if k == "<":
            if self.dest_first:
                d = self.fresh_tmp()
                t1, t2 = self.expr(e[1]), self.expr(e[2])
            else:
                t1, t2 = self.expr(e[1]), self.expr(e[2])
                d = self.fresh_tmp()
            endrel = self.fresh_label("end_relational")
            self.emit(f"li {d}, 0")
            self.emit(f"bge {t1}, {t2}, {endrel}")
            self.emit(f"li {d}, 1")
            self.label(endrel)
            return d
        raise ValueError(e)

    def stmt(self, s):
        k = s[0]
        if k == "=":
            t = self.expr(s[2])
            self.emit(f"mv {self.sym[s[1]]}, {t}")
        elif k == "while":
            ltest = self.fresh_label("begin_while")
            lend = self.fresh_label("end_while")
            self.label(ltest)
            t = self.expr(s[1])
            self.emit(f"beq {t}, zero, {lend}")
            for b in s[2]:
                self.stmt(b)
            self.emit(f"j {ltest}")
            self.label(lend)
        elif k == "print":
            t = self.expr(s[1])
            self.emit(f"mv a0, {t}")
            self.emit("call println_int")
        else:
            raise ValueError(s)

    def program(self, decls, body):
        self.decl(decls)
        for s in body:
            self.stmt(s)
        return "\n".join(self.code) + "\n"


V = lambda x: ("var", x)
C = lambda c: ("cst", c)

SRC1 = """int main() {
  int x, y;
  x = 1;
  y = 7;
  while (x < y) {
    x = x + 1;
  }
  println_int(x);
  return 0;
}"""
AST1 = (["x", "y"], [("=", "x", C(1)), ("=", "y", C(7)),
                     ("while", ("<", V("x"), V("y")), [("=", "x", ("+", V("x"), C(1)))]),
                     ("print", V("x"))])

SRC2 = """int x;
x=0;
while (x < 4){
   x=x+1;
}"""
AST2 = (["x"], [("=", "x", C(0)),
                ("while", ("<", V("x"), C(4)), [("=", "x", ("+", V("x"), C(1)))])])


def norm(text):
    return [it["text"] for it in parse(text)]


# --------------------------------------------------------------------------------------
# Affichage
# --------------------------------------------------------------------------------------

def show(title, text, varnames):
    print("=" * 78)
    print(title)
    print("=" * 78)
    code = parse(text)
    print("Listing (numéros de lignes du listing) :")
    for n, raw in enumerate(text.splitlines(), 1):
        print(f"  {n:2d}  {raw}")

    leaders = find_leaders(code)
    print("\nLeaders (règles de la diapo 53) :")
    for i, rs in leaders.items():
        print(f"  ligne {code[i]['line']:2d}  {code[i]['text']:<46} <- " + " ; ".join(rs))
    lab = label_index(code)
    targets = {target(it) for it in code if is_jump(it)}
    untargeted = [n for n in lab if n not in targets]
    print(f"  labels qui ne sont la cible d'aucun saut : {untargeted or 'aucun'}")
    same = find_leaders(code, call_ends_block=True).keys() == leaders.keys()
    print(f"  si un « call » terminait aussi un bloc (diapo 49) : leaders {'identiques' if same else 'DIFFÉRENTS'}")

    blocks = blocks_of(code, leaders)
    print(f"\nBlocs de base : {len(blocks)}")
    for k, (s, e) in enumerate(blocks):
        n_ins = sum(1 for i in range(s, e + 1) if code[i]["kind"] == "instr")
        lines = f"{code[s]['line']}" if s == e else f"{code[s]['line']}-{code[e]['line']}"
        print(f"  {bname(k)} : lignes {lines:<6} ({n_ins} instruction{'s' if n_ins > 1 else ''})")
        for i in range(s, e + 1):
            print(f"        {code[i]['line']:2d}  {code[i]['text']}")

    edges = cfg_edges(code, blocks)
    print(f"\nArcs du CFG : {len(edges)} (dont {sum(1 for e in edges if e[1] == 'EXIT')} vers la sortie)")
    for s, d, why in edges:
        back = "   <- arc retour (boucle)" if d != "EXIT" and d <= s else ""
        print(f"  {bname(s)} -> {bname(d):<5} {why}{back}")
    preds = {k: [bname(s) for s, d, _ in edges if d == k] for k in range(len(blocks))}
    print("  prédécesseurs : " + ", ".join(f"{bname(k)} <- {{{', '.join(p) or 'entrée'}}}"
                                          for k, p in preds.items()))

    regs, out, steps, counts, trace = run(code, blocks)
    print("\nExécution (interprète) :")
    print(f"  affiché par println_int : {out if out else 'rien'}")
    shown = {v: regs.get(t) for v, t in varnames.items()}
    print(f"  valeurs finales : {shown}")
    print(f"  instructions exécutées (labels non comptés) : {steps}")
    print("  passages par bloc : " + ", ".join(f"{bname(k)}={c}" for k, c in enumerate(counts)))
    print("  branchements (ligne, test, pris ?) :")
    for line, op, a, x, b, y, taken in trace:
        print(f"    l.{line:2d} {op} {a}={x}, {b}={y} -> {'pris' if taken else 'non pris'}")

    live_in, live_out, before, after = liveness(code, blocks, edges)
    print("\nVivacité (variables vivantes en entrée / sortie de chaque bloc) :")
    for k in range(len(blocks)):
        f = lambda s: "{" + ", ".join(sorted(s, key=lambda r: (r[:4] != "temp", r))) + "}"
        print(f"  {bname(k)} : in = {f(live_in[k])}   out = {f(live_out[k])}")
    print("  vivants juste AVANT chaque ligne :")
    mx = 0
    for i, it in enumerate(code):
        lv = sorted((r for r in before[i] if r.startswith("temp_")), key=lambda t: int(t[5:]))
        mx = max(mx, len(lv))
        print(f"    {it['line']:2d}  {it['text']:<46} {', '.join(lv) or '-'}")
    print(f"  maximum de temporaires vivants en même temps : {mx}")
    temps, inter = interference(code, after)
    print(f"  temporaires : {len(temps)} ; paires en interférence : {len(inter)}")
    print("    " + "  ".join(f"{a}-{b}" for a, b in inter))
    k, col = min_colors(temps, inter)
    print(f"  nombre minimal d'emplacements (coloriage exact du graphe d'interférence) : {k}")
    groups = {}
    for t, c in col.items():
        groups.setdefault(c, []).append(t)
    print("    un coloriage possible : " + " | ".join(", ".join(g) for g in groups.values()))
    return code, blocks, edges, live_out


def main():
    print("TD5 Compilation, exercices 1 et 2 : sortie de cfg.py\n")

    code1, blocks1, edges1, live_out1 = show("EXERCICE 1 : listing de l'énoncé", EX1,
                                             {"x": "temp_0", "y": "temp_1"})

    print("\n--- Exercice 1, question 2 : source MiniC proposée ---")
    print(SRC1)
    g = Gen().program(*AST1)
    ok = norm(g) == norm(EX1)
    print(f"Code généré par les règles du cours depuis cette source == listing de l'énoncé : {ok}")
    if not ok:
        print(g)
    print(f"  (temporaires : x -> temp_0, y -> temp_1 ; premier label n° 1)")
    print(f"  avec dest pris APRÈS les opérandes dans '<' : identique aussi ? "
          f"{norm(Gen(dest_first=False).program(*AST1)) == norm(EX1)}")
    alt = (["x"], [("=", "x", C(1)),
                   ("while", ("<", V("x"), C(7)), [("=", "x", ("+", V("x"), C(1)))]),
                   ("print", V("x"))])
    ga = Gen().program(*alt)
    print("Source fausse « int x; x = 1; while (x < 7) {x = x + 1;} println_int(x); » :"
          f" même code ? {norm(ga) == norm(EX1)} ; elle donne :")
    print(ga, end="")

    print("\n--- Optimisation locale dans le bloc du corps de boucle ---")
    k5 = next(k for k, (s, e) in enumerate(blocks1) if any(
        code1[i]["kind"] == "instr" and code1[i]["op"] == "add" for i in range(s, e + 1)))
    print(f"  bloc du corps : {bname(k5)} ; vivants en sortie : {sorted(live_out1[k5])}")
    print("  temp_5 et temp_6 vivants en sortie de ce bloc ? "
          f"{'temp_5' in live_out1[k5] or 'temp_6' in live_out1[k5]}")
    print("  remplacement : li temp_5, 1 / add temp_6, temp_0, temp_5 / mv temp_0, temp_6"
          "  ->  addi temp_0, temp_0, 1")
    codeo = parse(EX1_OPT)
    lo = find_leaders(codeo)
    bo = blocks_of(codeo, lo)
    _, outo, stepso, counto, _ = run(codeo, bo)
    _, out1, steps1, _, _ = run(code1, blocks1)
    print(f"  version optimisée : affiche {outo} (original : {out1}) ; "
          f"{stepso} instructions exécutées au lieu de {steps1} ; "
          f"{len(bo)} blocs, mêmes arcs : "
          f"{[(s, d) for s, d, _ in cfg_edges(codeo, bo)] == [(s, d) for s, d, _ in edges1]}")

    print()
    show("EXERCICE 2 : code 3 adresses proposé pour le programme de l'énoncé", EX2, {"x": "temp_0"})

    print("\n--- Exercice 2 : vérification par le générateur ---")
    print(SRC2)
    g2 = Gen().program(*AST2)
    print(f"Code écrit à la main == code produit par les règles (dest d'abord, diapo 25) : "
          f"{norm(g2) == norm(EX2)}")
    g2b = Gen(dest_first=False).program(*AST2)
    print("Variante si le générateur prenait dest APRÈS les opérandes dans '<' :")
    print(g2b, end="")
    c2b = parse(g2b)
    b2b = blocks_of(c2b, find_leaders(c2b))
    e2 = cfg_edges(parse(EX2), blocks_of(parse(EX2), find_leaders(parse(EX2))))
    print(f"  -> même découpage en blocs et mêmes arcs : "
          f"{[(s, d) for s, d, _ in cfg_edges(c2b, b2b)] == [(s, d) for s, d, _ in e2]}"
          f" ; x final = {run(c2b, b2b)[0]['temp_0']}")


if __name__ == "__main__":
    main()
