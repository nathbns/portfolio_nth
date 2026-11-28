#!/usr/bin/env python3
"""TD5 Compilation (Ensimag 2A), section 5.2 : Sethi-Ullman et vivacite.

Verifie les exercices 3 et 4 :
  - rho sur chaque noeud de l'AST, code de Sethi-Ullman (postfixe, plus gros rho d'abord,
    egalite -> fils gauche d'abord) ;
  - code 3 adresses dirige par la syntaxe (toujours gauche puis droite) pour comparaison ;
  - intervalles de vie et nombre maximal de valeurs vivantes simultanement ;
  - minimum de ce maximum sur TOUS les ordonnancements valides (enumeration exhaustive) ;
  - meme graphe de dependances pour les deux codes (ex. 4 q2) ;
  - simulation numerique (avec temporaires, puis avec registres physiques apres linear scan).
Exemples du cours recalcules : CM8 diapo 28/32 (deux ordres) et 31/32 (b*b + 4*a*c).

Convention de vivacite : une valeur est vivante du point juste apres sa definition
jusqu'a sa derniere lecture (incluse : l'instruction qui la lit pour la derniere fois
peut ecrire son resultat dans le meme registre). Le point p_i est le point situe juste
apres l'instruction i ; v est vivante en p_i ssi def(v) <= i < derniere_lecture(v).
Le resultat de l'expression est considere comme vivant a la sortie (lu ensuite).

Usage : python3 -I ex34_sethi_ullman.py               (tout le TD)
        python3 -I ex34_sethi_ullman.py listing.txt   (vivacite d'un listing quelconque)
Bibliotheque standard uniquement.
"""
import re
import sys

OPS = {'+': 'add', '-': 'sub', '*': 'mul', '/': 'div'}
PYOP = {'+': lambda x, y: x + y, '-': lambda x, y: x - y,
        '*': lambda x, y: x * y, '/': lambda x, y: x // y}


# ----------------------------------------------------------------------------- AST
def is_leaf(node):
    return not isinstance(node, tuple)


def rho(node):
    if is_leaf(node):
        return 1
    _, l, r = node
    rl, rr = rho(l), rho(r)
    return max(rl, rr) if rl != rr else rl + 1


def show(node):
    if is_leaf(node):
        return str(node)
    op, l, r = node
    return f"({show(l)} {op} {show(r)})"


def tree_lines(node, prefix='', label='racine'):
    """AST indente, rho ecrit sur chaque noeud."""
    name = str(node) if is_leaf(node) else node[0]
    kind = 'feuille' if is_leaf(node) else 'noeud'
    out = [f"{prefix}{label}: {name}   rho = {rho(node)}   ({kind} {show(node)})"]
    if not is_leaf(node):
        out += tree_lines(node[1], prefix + '    ', 'fils gauche')
        out += tree_lines(node[2], prefix + '    ', 'fils droit ')
    return out


def eval_ast(node, env):
    if is_leaf(node):
        return env[node] if isinstance(node, str) else node
    op, l, r = node
    return PYOP[op](eval_ast(l, env), eval_ast(r, env))


# ------------------------------------------------------------------ generation
class Gen:
    def __init__(self, start=1):
        self.n = start - 1
        self.code = []          # dicts : text, dest, srcs, path

    def fresh(self):
        self.n += 1
        return f"temp_{self.n}"

    def emit(self, text, dest, srcs, path):
        self.code.append(dict(text=text, dest=dest, srcs=list(srcs), path=path))


def gen_leaf(node, g, path):
    t = g.fresh()
    if isinstance(node, str):
        g.emit(f"ld  {t}, [{node}]", t, [], path)
    else:
        g.emit(f"li  {t}, {node}", t, [], path)
    return t


def gen_su(node, g, path='E'):
    """Sethi-Ullman : postfixe, le fils de plus grand rho d'abord ; egalite -> gauche."""
    if is_leaf(node):
        return gen_leaf(node, g, path)
    op, l, r = node
    if rho(r) > rho(l):
        tr = gen_su(r, g, path + 'd')
        tl = gen_su(l, g, path + 'g')
    else:
        tl = gen_su(l, g, path + 'g')
        tr = gen_su(r, g, path + 'd')
    t = g.fresh()
    g.emit(f"{OPS[op]} {t}, {tl}, {tr}", t, [tl, tr], path)
    return t


def gen_sd(node, g, path='E'):
    """Code 3 adresses dirige par la syntaxe (regle e1 op e2 du cours) :
    t1 <- GenCodeExpr(e1) ; t2 <- GenCodeExpr(e2) ; dest <- fresh_tmp() ; op dest, t1, t2.
    Feuille variable : variable en case de pile, donc ld dest, [x] (comme dans l'enonce)."""
    if is_leaf(node):
        return gen_leaf(node, g, path)
    op, l, r = node
    tl = gen_sd(l, g, path + 'g')
    tr = gen_sd(r, g, path + 'd')
    t = g.fresh()
    g.emit(f"{OPS[op]} {t}, {tl}, {tr}", t, [tl, tr], path)
    return t


# -------------------------------------------------------------------- vivacite
def liveness(code, live_at_end=(), count=lambda v: True):
    """code : liste de dicts (dest, srcs). Indices d'instruction 1..n.
    Renvoie (intervalles {v: (def, last)}, points [ensemble vivant en p_0 .. p_n])."""
    n = len(code)
    d, last = {}, {}
    for i, ins in enumerate(code, 1):
        for s in ins['srcs']:
            if count(s):
                d.setdefault(s, 0)          # lu sans etre defini dans le bloc : vivant a l'entree
                last[s] = i
        if ins['dest'] is not None and count(ins['dest']):
            assert ins['dest'] not in d, f"{ins['dest']} defini deux fois"
            d[ins['dest']] = i
    for v in live_at_end:
        last[v] = n + 1
    for v in d:
        last.setdefault(v, d[v])            # definie jamais lue : intervalle vide
    iv = {v: (d[v], last[v]) for v in d}
    points = [{v for v, (a, b) in iv.items() if a <= i < b} for i in range(n + 1)]
    return iv, points


def order_key(v):
    m = re.search(r'(\d+)$', v)
    return (int(m.group(1)) if m else 0, v)


def print_liveness(code, live_at_end=(), title='', count=lambda v: True):
    iv, points = liveness(code, live_at_end, count)
    vs = sorted(iv, key=lambda v: (iv[v][0], order_key(v)))
    n = len(code)
    w = max(len(c['text']) for c in code) + 2
    short = {v: (re.sub(r'^temp_', 't', v)) for v in vs}
    cw = max(3, max(len(s) for s in short.values()) + 1)
    if title:
        print(title)
    print('  n°  ' + 'instruction'.ljust(w) + ''.join(short[v].ljust(cw) for v in vs)
          + 'vivants apres la ligne')
    mx = max(len(p) for p in points)
    for i, ins in enumerate(code, 1):
        cells = []
        for v in vs:
            a, b = iv[v]
            if a == i and b > i:
                ch = '┬'
            elif a == i:
                ch = '•'
            elif a < i < b:
                ch = '│'
            elif a < i == b:
                ch = '┴'
            else:
                ch = ' '
            cells.append(ch.ljust(cw))
        k = len(points[i])
        mark = '   <-- max' if k == mx else ''
        live = ', '.join(sorted(points[i], key=order_key))
        print(f"  {i:>2}  {ins['text'].ljust(w)}{''.join(cells)}{k}  {{{live}}}{mark}")
    print('  Intervalles (ligne de definition -> ligne de derniere lecture ; n+1 = vivant en sortie) :')
    for v in vs:
        a, b = iv[v]
        print(f"     {v:>8} : {a} -> {b}")
    print(f"  Maximum de valeurs vivantes simultanement : {mx}, aux points "
          + ', '.join(f"p_{i} (entre ligne {i} et ligne {i+1})" for i, p in enumerate(points)
                      if len(p) == mx))
    entry = [points[i - 1] for i in range(1, n + 1)]
    print('  Convention de la diapo 31/32 (vivants a l\'ENTREE de chaque instruction) : '
          + ' '.join(str(len(e)) for e in entry) + f" -> max {max(len(e) for e in entry)}")
    return iv, points, mx


# ------------------------------------------------------- ordonnancements valides
def deps(code):
    """Graphe de dependances de donnees (def -> use) entre indices d'instructions."""
    where = {ins['dest']: i for i, ins in enumerate(code) if ins['dest']}
    return {i: {where[s] for s in ins['srcs'] if s in where} for i, ins in enumerate(code)}


def topo_orders(code):
    pred = deps(code)
    n = len(code)

    def rec(done, order):
        if len(order) == n:
            yield list(order)
            return
        for i in range(n):
            if i not in done and pred[i] <= done:
                done.add(i)
                order.append(i)
                yield from rec(done, order)
                order.pop()
                done.discard(i)
    yield from rec(set(), [])


def max_live(code, live_at_end=(), count=lambda v: True):
    _, pts = liveness(code, live_at_end, count)
    return max(len(p) for p in pts)


def schedule_study(code, live_at_end, label):
    vals = []
    for order in topo_orders(code):
        vals.append(max_live([code[i] for i in order], live_at_end))
    m = min(vals)
    print(f"  {label} : {len(vals)} ordonnancements valides ; max-vivants minimal = {m} "
          f"(atteint par {vals.count(m)} ordres), pire = {max(vals)}")
    return m


def check_schedule(code):
    """theta(def) < theta(use) pour chaque temporaire lu ; chaque temporaire ecrit une fois."""
    where = {}
    for i, ins in enumerate(code):
        for s in ins['srcs']:
            if s not in where:
                return False
        if ins['dest'] in where:
            return False
        where[ins['dest']] = i
    return True


# ------------------------------------------------------------------ simulation
def simulate(code, env):
    regs = {}
    for ins in code:
        t = ins['text'].replace(',', ' ').split()
        op = t[0]
        if op == 'ld':
            regs[t[1]] = env[t[2].strip('[]')]
        elif op == 'li':
            regs[t[1]] = int(t[2])
        else:
            a, b = regs[t[2]], regs[t[3]]
            regs[t[1]] = {'add': a + b, 'sub': a - b, 'mul': a * b, 'div': a // b}[op]
    return regs


def linear_scan(code, live_at_end, phys):
    """Affecte un registre physique a chaque temporaire (premier registre libre,
    intervalles tries par debut ; un registre libere a la ligne i est reutilisable a la ligne i)."""
    iv, _ = liveness(code, live_at_end)
    alloc, active = {}, []
    for v in sorted(iv, key=lambda v: iv[v][0]):
        a, b = iv[v]
        active = [(w, r) for (w, r) in active if iv[w][1] > a]
        used = {r for _, r in active}
        free = [r for r in phys if r not in used]
        assert free, 'pas assez de registres'
        alloc[v] = free[0]
        active.append((v, free[0]))
    # verification : deux temporaires de meme registre ont des intervalles disjoints
    for v in iv:
        for w in iv:
            if v < w and alloc[v] == alloc[w]:
                (a1, b1), (a2, b2) = iv[v], iv[w]
                assert not (max(a1, a2) < min(b1, b2)), (v, w)
    phys_code = []
    for ins in code:
        txt = ins['text']
        for v in sorted(alloc, key=lambda s: -len(s)):
            txt = re.sub(rf'\b{v}\b', alloc[v], txt)
        phys_code.append(dict(text=txt, dest=alloc[ins['dest']],
                              srcs=[alloc[s] for s in ins['srcs']], path=ins['path']))
    return alloc, phys_code


# ------------------------------------------------------------------ exercices
def section(t):
    print()
    print('=' * 100)
    print(t)
    print('=' * 100)


def run_expr(name, E, env):
    section(f"{name} : E = {show(E)}")
    print("AST avec rho sur chaque noeud :")
    for line in tree_lines(E):
        print('   ' + line)
    print(f"rho(E) = {rho(E)}  => nombre minimal de registres (sans move ni decoupage d'intervalle)")

    g = Gen(1)
    res = gen_su(E, g)
    su = g.code
    print("\nCode de Sethi-Ullman (temporaires numerotes dans l'ordre d'emission, temp_k defini ligne k) :")
    for i, ins in enumerate(su, 1):
        print(f"  {i:>2}  {ins['text']:<28} # noeud {ins['path']}")
    print(f"  ordonnancement correct (def avant use) : {check_schedule(su)}")
    regs = simulate(su, env)
    print(f"  simulation avec {env} : {res} = {regs[res]} ; valeur attendue {eval_ast(E, env)}"
          f" -> {'OK' if regs[res] == eval_ast(E, env) else 'ERREUR'}")
    print()
    iv, pts, mx = print_liveness(su, [res], 'Vivacite du code de Sethi-Ullman :')
    print()
    m_su = schedule_study(su, [res], 'Tous les ordres du meme graphe de dependances')
    alloc, pc = linear_scan(su, [res], ['t0', 't1', 't2', 't3', 't4', 't5'])
    nregs = len(set(alloc.values()))
    print(f"  Linear scan sur le code SU : {nregs} registres physiques ; "
          + ', '.join(f"{v}->{r}" for v, r in alloc.items()))
    for ins in pc:
        print(f"      {ins['text']}")
    regs = simulate(pc, env)
    print(f"  simulation registres physiques : {alloc[res]} = {regs[alloc[res]]}"
          f" -> {'OK' if regs[alloc[res]] == eval_ast(E, env) else 'ERREUR'}")

    g2 = Gen(1)
    res2 = gen_sd(E, g2)
    sd = g2.code
    print("\nCode 3 adresses dirige par la syntaxe (toujours e1 puis e2) :")
    for i, ins in enumerate(sd, 1):
        print(f"  {i:>2}  {ins['text']:<28} # noeud {ins['path']}")
    print(f"  ordonnancement correct (def avant use) : {check_schedule(sd)}")
    regs = simulate(sd, env)
    print(f"  simulation : {res2} = {regs[res2]} -> {'OK' if regs[res2] == eval_ast(E, env) else 'ERREUR'}")
    same = [a['text'] == b['text'] for a, b in zip(su, sd)]
    print(f"  identique au code SU ligne a ligne : {all(same)}")
    print()
    print_liveness(sd, [res2], 'Vivacite du code dirige par la syntaxe :')

    # meme graphe de dependances ? (aretes entre noeuds de l'AST, identifies par leur chemin)
    def dep_edges(code):
        p = {ins['dest']: ins['path'] for ins in code}
        return {(p[s], ins['path']) for ins in code for s in ins['srcs']}
    e1, e2 = dep_edges(su), dep_edges(sd)
    print(f"\n  Graphe de dependances (aretes noeud fils -> noeud pere) identique pour les deux codes : {e1 == e2}"
          f" ({len(e1)} aretes)")
    pos_su = {ins['path']: i for i, ins in enumerate(su, 1)}
    pos_sd = {ins['path']: i for i, ins in enumerate(sd, 1)}
    moved = [(p, pos_sd[p], pos_su[p]) for p in pos_su if pos_su[p] != pos_sd[p]]
    if moved:
        print("  Instructions deplacees (noeud : ligne dans le code dirige par la syntaxe -> ligne dans SU) :")
        for p, a, b in moved:
            print(f"     {p:<6} {sd[a-1]['text']:<26} ligne {a} -> ligne {b}")
    return su, sd


def slide_examples():
    section("Exemples du cours (CM8)")
    print("Diapo 28/32 : memes 9 instructions, deux ordres (t1 lu en memoire, st(y,t8) a la fin).")
    base = {
        'a': ('t1 := ld(x)', 't1', []), 'b': ('t2 := t1 + 4', 't2', ['t1']),
        'c': ('t3 := t1 * 8', 't3', ['t1']), 'd': ('t4 := t1 - 4', 't4', ['t1']),
        'e': ('t5 := t1 / 2', 't5', ['t1']), 'f': ('t6 := t2 * t3', 't6', ['t2', 't3']),
        'g': ('t7 := t4 - t5', 't7', ['t4', 't5']), 'h': ('t8 := t6 * t7', 't8', ['t6', 't7']),
        'i': ('st(y,t8)', None, ['t8'])}
    for name, order in (('ordre de gauche', 'abcdefghi'), ('ordre de droite', 'adegcbfhi')):
        code = [dict(text=f"({k}) {base[k][0]}", dest=base[k][1], srcs=base[k][2], path=k) for k in order]
        print()
        print_liveness(code, (), f"Diapo 28/32, {name} :")
    print()
    print("Diapo 31/32 : b*b + 4*(a*c), a, b, c deja en registres (non comptes).")
    code = [dict(text='mul tmp1, b, b', dest='tmp1', srcs=['b', 'b'], path=''),
            dict(text='mul tmp2, a, c', dest='tmp2', srcs=['a', 'c'], path=''),
            dict(text='li tmp3, 4', dest='tmp3', srcs=[], path=''),
            dict(text='mul tmp4, tmp2, tmp3', dest='tmp4', srcs=['tmp2', 'tmp3'], path=''),
            dict(text='add tmp5, tmp1, tmp4', dest='tmp5', srcs=['tmp1', 'tmp4'], path='')]
    print_liveness(code, ['tmp5'], '', count=lambda v: v.startswith('tmp'))
    E = ('+', ('*', 'b', 'b'), ('*', 4, ('*', 'a', 'c')))
    print(f"  rho(b*b + 4*(a*c)) = {rho(E)} (diapo : 3)")


def parse_listing(path):
    """Listing quelconque : 'op dest, src1, src2' (RISC-V) ou 'x = y op z' / 'x = load m' / 'ret x'."""
    code = []
    ident = re.compile(r'^[A-Za-z_]\w*$')
    for raw in open(path, encoding='utf-8'):
        line = raw.split('#')[0].strip()
        if not line:
            continue
        if '=' in line and not line.startswith(('ld', 'li', 'sd')):
            lhs, rhs = [s.strip() for s in line.split('=', 1)]
            toks = rhs.replace('(', ' ').replace(')', ' ').split()
            srcs = [] if toks[0] == 'load' else [t for t in toks if ident.match(t)]
            code.append(dict(text=line, dest=lhs, srcs=srcs, path=''))
        elif line.startswith('ret') or line.startswith('store'):
            toks = line.split()
            code.append(dict(text=line, dest=None, srcs=[toks[1]], path=''))
        else:
            toks = line.replace(',', ' ').split()
            op, args = toks[0], toks[1:]
            if op in ('ld', 'li'):
                code.append(dict(text=line, dest=args[0], srcs=[], path=''))
            elif op in ('sd', 'beq', 'bne', 'blt', 'bge'):
                code.append(dict(text=line, dest=None,
                                 srcs=[a for a in args if ident.match(a) and a != 'zero'], path=''))
            else:
                code.append(dict(text=line, dest=args[0],
                                 srcs=[a for a in args[1:] if ident.match(a) and a != 'zero'], path=''))
    return code


def main():
    if len(sys.argv) > 1:
        code = parse_listing(sys.argv[1])
        print_liveness(code, (), f"Vivacite de {sys.argv[1]} :")
        return
    print("TD5 Compilation - section 5.2 - verification des exercices 3 et 4")
    print("Convention : v vivante au point p_i (juste apres la ligne i) ssi def(v) <= i < derniere lecture(v) ;")
    print("le resultat de E est vivant en sortie. Les feuilles valent rho = 1 (ld ou li).")
    slide_examples()
    E3 = ('+', ('*', ('+', 'a', 'b'), ('-', 'a', 'b')), 1)
    run_expr("Exercice 3", E3, {'a': 5, 'b': 3})
    E4 = ('+', ('*', 'n', ('+', 'n', 1)), ('*', 2, 'n'))
    run_expr("Exercice 4", E4, {'n': 7})
    section("Exercice 3 : variante DAG (a et b charges une seule fois, pour info)")
    dag = [dict(text='ld  temp_1, [a]', dest='temp_1', srcs=[], path=''),
           dict(text='ld  temp_2, [b]', dest='temp_2', srcs=[], path=''),
           dict(text='add temp_3, temp_1, temp_2', dest='temp_3', srcs=['temp_1', 'temp_2'], path=''),
           dict(text='sub temp_4, temp_1, temp_2', dest='temp_4', srcs=['temp_1', 'temp_2'], path=''),
           dict(text='mul temp_5, temp_3, temp_4', dest='temp_5', srcs=['temp_3', 'temp_4'], path=''),
           dict(text='li  temp_6, 1', dest='temp_6', srcs=[], path=''),
           dict(text='add temp_7, temp_5, temp_6', dest='temp_7', srcs=['temp_5', 'temp_6'], path='')]
    print_liveness(dag, ['temp_7'])
    print(f"  valeur : {simulate(dag, {'a': 5, 'b': 3})['temp_7']} (attendu 17)")
    schedule_study(dag, ['temp_7'], 'Tous les ordres valides du DAG')
    section("Exercice 4 : le sous-arbre gauche n*(n+1) seul (gain local de Sethi-Ullman)")
    sub = ('*', 'n', ('+', 'n', 1))
    for name, gen in (('Sethi-Ullman', gen_su), ('dirige par la syntaxe', gen_sd)):
        g = Gen(1)
        r = gen(sub, g)
        print(f"  {name:<22}: " + ' ; '.join(c['text'] for c in g.code)
              + f"  -> max vivants = {max_live(g.code, [r])}")
    print(f"  rho(n*(n+1)) = {rho(sub)}")
    section("Exercice 4 : variante commutee (pour info) : si on avait ecrit (n+1)*n")
    E4b = ('+', ('*', ('+', 'n', 1), 'n'), ('*', 2, 'n'))
    g_su, g_sd = Gen(1), Gen(1)
    gen_su(E4b, g_su)
    gen_sd(E4b, g_sd)
    same = [c['text'] for c in g_su.code] == [c['text'] for c in g_sd.code]
    print(f"  rho = {rho(E4b)} ; code SU identique au code dirige par la syntaxe : {same}")


if __name__ == '__main__':
    main()
