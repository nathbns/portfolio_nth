#!/usr/bin/env python3
"""TD5 Compilation (Ensimag 2A), section 5.3 : allocation de registres locale (ex. 5 et 6).

Programme de l'enonce (bloc de base, 9 instructions) :
    1 a = load m0 ; 2 b = load m1 ; 3 c = a + b ; 4 d = 4 * c ; 5 e = b + 1 ;
    6 f = e + a ; 7 g = d / e ; 8 h = f - g ; 9 ret h

Convention de vivacite : v est vivante du point juste apres sa definition jusqu'a sa
derniere lecture incluse ; p_i = point juste apres la ligne i ; v vivante en p_i ssi
def(v) <= i < derniere_lecture(v). Deux variables interferent ssi elles sont vivantes en
un meme point. L'instruction qui lit v pour la derniere fois peut ecrire dans le registre de v.

Exercice 5 : intervalles, interferences, linear scan (bin packing, premier registre libre)
             avec 6 registres, verification qu'aucun registre ne porte deux intervalles qui se
             chevauchent ; minimum du max-vivants sur tous les ordres valides.
Exercice 6 : 2 registres R0, R1, cases m0..m6. Recherche exhaustive (Dijkstra) du nombre
             minimal de load/store inseres ; allocateur glouton "prochaine utilisation la plus
             lointaine" ; simulation symbolique ET numerique de la solution retenue ; comparaison
             avec "tout en memoire".
Modele (ex. 6) : ordre des 9 instructions fixe ; constantes = immediats (pas de registre) ;
             chaque operande lu doit etre en registre, le resultat est ecrit dans un registre ;
             un load ou un store insere coute 1 ; a et b sont deja en memoire (m0, m1).
Bibliotheque standard uniquement : python3 -I ex56_regalloc.py
"""
import heapq
import itertools

PROG = [  # (texte, dest, srcs, sorte)
    ('a = load m0', 'a', [], 'load'),
    ('b = load m1', 'b', [], 'load'),
    ('c = a + b', 'c', ['a', 'b'], 'op'),
    ('d = 4 * c', 'd', ['c'], 'op'),
    ('e = b + 1', 'e', ['b'], 'op'),
    ('f = e + a', 'f', ['e', 'a'], 'op'),
    ('g = d / e', 'g', ['d', 'e'], 'op'),
    ('h = f - g', 'h', ['f', 'g'], 'op'),
    ('ret h', None, ['h'], 'ret'),
]
N = len(PROG)
INIT_MEM = {'a': 'm0', 'b': 'm1'}


def semantics(vals, text):
    """Valeur numerique d'une instruction 'x = y op z' (division entiere)."""
    lhs, rhs = [s.strip() for s in text.split('=')]
    t = rhs.split()
    get = lambda s: int(s) if s.isdigit() else vals[s]
    x, op, y = get(t[0]), t[1], get(t[2])
    return {'+': x + y, '-': x - y, '*': x * y, '/': x // y}[op]


# ------------------------------------------------------------------ vivacite
def intervals(prog):
    d, last = {}, {}
    for i, (_, dest, srcs, _) in enumerate(prog, 1):
        for s in srcs:
            last[s] = i
        if dest:
            d[dest] = i
    return {v: (d[v], last[v]) for v in d}


def live_points(prog):
    iv = intervals(prog)
    return [{v for v, (a, b) in iv.items() if a <= i < b} for i in range(len(prog) + 1)]


def print_liveness(prog):
    iv = intervals(prog)
    pts = live_points(prog)
    vs = sorted(iv, key=lambda v: iv[v][0])
    mx = max(len(p) for p in pts)
    print('  n°  instruction    ' + '  '.join(vs) + '   vivants apres la ligne')
    for i, (txt, *_rest) in enumerate(prog, 1):
        cells = []
        for v in vs:
            a, b = iv[v]
            ch = '┬' if a == i else '│' if a < i < b else '┴' if a < i == b else ' '
            cells.append(ch)
        k = len(pts[i])
        live = ', '.join(sorted(pts[i]))
        print(f"  {i:>2}  {txt:<14} " + '  '.join(cells) + f"   {k}  {{{live}}}" + ('   <-- max' if k == mx else ''))
    print('  Intervalles (definition -> derniere lecture) : '
          + ' ; '.join(f"{v} : {a}->{b}" for v, (a, b) in sorted(iv.items(), key=lambda x: x[1][0])))
    print(f"  Max vivants simultanes : {mx} aux points "
          + ', '.join(f"p_{i}" for i, p in enumerate(pts) if len(p) == mx))
    entry = [len(pts[i - 1]) for i in range(1, len(prog) + 1)]
    print(f"  Vivants a l'entree de chaque instruction (convention diapo 31/32) : {entry}")
    return iv, pts, mx


def interferences(prog):
    pts = live_points(prog)
    edges = set()
    for p in pts:
        for u, v in itertools.combinations(sorted(p), 2):
            edges.add((u, v))
    return sorted(edges)


def overlap(i1, i2):
    (a1, b1), (a2, b2) = i1, i2
    return max(a1, a2) < min(b1, b2)


# ------------------------------------------------------------- linear scan
def linear_scan(prog, regs):
    """Bin packing glouton : intervalles tries par debut ; on libere ceux qui finissent
    avant ou au debut du nouveau ; premier registre libre ; sinon spill de l'intervalle
    qui finit le plus tard (heuristique de Poletto-Sarkar)."""
    iv = intervals(prog)
    alloc, active, spilled, log = {}, [], [], []
    for v in sorted(iv, key=lambda v: (iv[v][0], v)):
        a, b = iv[v]
        expired = [w for w in active if iv[w][1] <= a]
        active = [w for w in active if iv[w][1] > a]
        used = {alloc[w] for w in active}
        free = [r for r in regs if r not in used]
        if free:
            alloc[v] = free[0]
            active.append(v)
            log.append(f"ligne {a}: {v} {iv[v]} -> {free[0]}"
                       + (f"   (liberes avant : {', '.join(expired)})" if expired else ''))
        else:
            far = max(active + [v], key=lambda w: iv[w][1])
            spilled.append(far)
            if far != v:
                alloc[v] = alloc.pop(far)
                active.remove(far)
                active.append(v)
            log.append(f"ligne {a}: {v} {iv[v]} : plus de registre libre -> spill de {far}")
    for v, w in itertools.combinations(alloc, 2):
        if alloc[v] == alloc[w]:
            assert not overlap(iv[v], iv[w]), f"conflit {v} {w}"
    return alloc, spilled, log


def print_bars(prog, alloc, regs):
    """Contenu de chaque registre juste apres chaque ligne (barre = intervalle de vie)."""
    iv = intervals(prog)
    print('  ligne  instruction    ' + ''.join(r.ljust(5) for r in regs))
    for i, (txt, *_r) in enumerate(prog, 1):
        row = []
        for r in regs:
            here = [v for v, rr in alloc.items() if rr == r and iv[v][0] <= i <= iv[v][1]]
            # a la ligne i, un registre peut voir finir une variable (lue) et en naitre une autre
            if len(here) == 2:
                old, new = sorted(here, key=lambda v: iv[v][0])
                row.append(f"{old}>{new}".ljust(5))
            elif here:
                v = here[0]
                a, b = iv[v]
                mark = '┬' if i == a else '┴' if i == b else '│'
                row.append(f"{v}{mark}".ljust(5))
            else:
                row.append('.'.ljust(5))
        print(f"  {i:>4}   {txt:<14} " + ''.join(row))
    print("  (x┬ : x defini a cette ligne ; x│ : x vivant ; x┴ : derniere lecture de x ;"
          " x>y : x lu pour la derniere fois et y ecrit dans le meme registre)")


# ------------------------------------------------------------ ordonnancements
def topo_min_maxlive(prog):
    where = {dest: i for i, (_, dest, _, _) in enumerate(prog) if dest}
    pred = {i: {where[s] for s in srcs} for i, (_, _, srcs, _) in enumerate(prog)}
    res = []

    def rec(done, order):
        if len(order) == len(prog):
            res.append(max(len(p) for p in live_points([prog[i] for i in order])))
            return
        for i in range(len(prog)):
            if i not in done and pred[i] <= done:
                done.add(i)
                order.append(i)
                rec(done, order)
                order.pop()
                done.discard(i)
    rec(set(), [])
    return len(res), min(res), res.count(min(res))


# ------------------------------------------------- ex 6 : recherche exhaustive
IV = intervals(PROG)


def needed(v, k):
    """v encore utile avant l'instruction k (1-based) : lue a une ligne >= k."""
    return v is not None and IV[v][1] >= k


def norm(k, regs, mem):
    regs = tuple(v if needed(v, k) else None for v in regs)
    mem = frozenset(v for v in mem if needed(v, k) or (v in INIT_MEM and IV[v][0] >= k))
    return regs, mem


def ok_after(k, regs, mem):
    """Apres l'instruction k : toute valeur encore utile (lue a une ligne > k) est quelque part."""
    alive = {v for v, (a, b) in IV.items() if a <= k < b}
    return all(v in regs or v in mem for v in alive)


def moves(k, regs, mem):
    """Transitions avant l'instruction k (1-based) : (cout, nb_load, nb_store, op, nouvel etat)."""
    out = []
    for r, v in enumerate(regs):
        if v is not None and v not in mem:
            out.append((1, 0, 1, f"store {v}", (k, regs, mem | {v})))
    for v in mem:
        if not needed(v, k) or v in regs:
            continue
        for r in range(2):
            old = regs[r]
            if old is not None and old not in mem and needed(old, k):
                continue  # on perdrait old
            nr = list(regs)
            nr[r] = v
            out.append((1, 1, 0, f"{v} = load -> R{r}", (k, tuple(nr), mem)))
    # execution de l'instruction k
    txt, dest, srcs, kind = PROG[k - 1]
    if kind == 'ret':
        if srcs[0] in regs:
            out.append((0, 0, 0, txt, (k + 1, (None, None), frozenset())))
    elif kind == 'load':
        if dest in mem:
            for r in range(2):
                nr = list(regs)
                nr[r] = dest
                nr = tuple(nr)
                if ok_after(k, nr, mem):
                    out.append((0, 0, 0, f"{txt} -> R{r}", (k + 1, nr, mem)))
    else:
        if all(s in regs for s in srcs):
            for r in range(2):
                nr = list(regs)
                nr[r] = dest
                nr = tuple(nr)
                if ok_after(k, nr, mem):
                    out.append((0, 0, 0, f"{txt} -> R{r}", (k + 1, nr, mem)))
    return out


def dijkstra(key):
    """key(cout, loads, stores) -> priorite lexicographique."""
    start = (1, (None, None), frozenset(INIT_MEM))
    s = (start[0],) + norm(*start)
    dist = {s: (0, 0, 0)}
    prev = {s: None}
    cnt = itertools.count()
    pq = [(key(0, 0, 0), next(cnt), 0, 0, 0, s)]
    while pq:
        _, _, c, l, st, s = heapq.heappop(pq)
        if dist.get(s) != (c, l, st):
            continue
        k, regs, mem = s
        if k == N + 1:
            path = []
            while prev[s]:
                s, op = prev[s]
                path.append(op)
            return (c, l, st), path[::-1]
        for dc, dl, dst, op, (k2, r2, m2) in moves(k, regs, mem):
            r2n, m2n = norm(k2, r2, m2) if k2 <= N else (r2, m2)
            s2 = (k2, r2n, m2n)
            nd = (c + dc, l + dl, st + dst)
            if s2 not in dist or key(*nd) < key(*dist[s2]):
                dist[s2] = nd
                prev[s2] = (s, op)
                heapq.heappush(pq, (key(*nd), next(cnt), *nd, s2))
    return None, None


def count_optimal(best):
    """Nombre de suites d'operations (load/store inseres + choix de registre) de cout minimal."""
    from functools import lru_cache
    start = (1,) + norm(1, (None, None), frozenset(INIT_MEM))

    @lru_cache(maxsize=None)
    def rec(k, regs, mem, budget):
        if k == N + 1:
            return 1, frozenset({(0, 0)})
        total, splits = 0, set()
        for dc, dl, dst, op, (k2, r2, m2) in moves(k, regs, mem):
            if dc > budget:
                continue
            r2n, m2n = norm(k2, r2, m2) if k2 <= N else (r2, m2)
            n, sp = rec(k2, r2n, m2n, budget - dc)
            if n:
                total += n
                splits |= {(l + dl, s + dst) for l, s in sp}
        return total, frozenset(splits)
    n, sp = rec(*start, best)
    return n, sorted(sp)


# --------------------------------------------- ex 6 : allocateur glouton
def greedy_furthest():
    """Avant chaque lecture : si la valeur n'est pas en registre, on la recharge ; s'il faut
    un registre, on evince la valeur dont la prochaine lecture est la plus lointaine
    (store seulement si elle n'est pas deja en memoire)."""
    regs = {'R0': None, 'R1': None}
    cell = dict(INIT_MEM)
    free_cells = ['m2', 'm3', 'm4', 'm5', 'm6']
    out = []

    def next_use(v, k):
        uses = [i for i, (_, _, srcs, _) in enumerate(PROG, 1) if v in srcs and i >= k]
        return min(uses) if uses else 10 ** 9

    def get_reg(k, protect):
        for r in regs:
            v = regs[r]
            if v is None or not needed(v, k):
                return r
        cand = [r for r in regs if regs[r] not in protect]
        r = max(cand, key=lambda r: next_use(regs[r], k))
        v = regs[r]
        if v not in cell:
            cell[v] = free_cells.pop(0)
            out.append(('store', v, r, cell[v]))
        return r

    for k, (txt, dest, srcs, kind) in enumerate(PROG, 1):
        if kind == 'load':
            r = get_reg(k, set())
            out.append(('origload', dest, r, INIT_MEM[dest]))
            regs[r] = dest
            continue
        for s in srcs:
            if s not in regs.values():
                r = get_reg(k, set(srcs))
                out.append(('load', s, r, cell[s]))
                regs[r] = s
        if kind == 'ret':
            out.append(('ret', srcs[0], [r for r in regs if regs[r] == srcs[0]][0]))
            continue
        # destination : un registre dont la valeur meurt ici (ou vide) ; sinon on evince
        # (les operandes sont deja lus, on peut donc ecraser l'un d'eux s'il est sauvegarde)
        rd = get_reg(k + 1, set())
        out.append(('op', txt, rd, [(s, [r for r in regs if regs[r] == s][0]) for s in srcs]))
        regs[rd] = dest
    return out


# --------------------------------------------- ex 6 : simulateur symbolique + numerique
def simulate(code, m0=6, m1=2, label=''):
    """code : liste de pas
         ('origload', x, R, m) / ('load', x, R, m) : R <- mem[m], on verifie mem[m] == x
         ('store', x, R, m)                       : on verifie R == x, mem[m] <- x
         ('op', 'x = y op z', Rd, [(y, Ry), (z, Rz)]) : on verifie Ry == y, Rz == z ; Rd <- x
         ('ret', h, R)                            : on verifie R == h
    Verifie aussi : seulement R0/R1, cases m0..m6, valeur numerique finale = programme d'origine."""
    sym = {'R0': None, 'R1': None}
    num = {'R0': None, 'R1': None}
    msym = {f"m{i}": None for i in range(7)}
    mnum = dict(msym)
    msym['m0'], msym['m1'] = 'a', 'b'
    mnum['m0'], mnum['m1'] = m0, m1
    ref = {'a': m0, 'b': m1}
    for txt, dest, _, kind in PROG:
        if kind == 'op':
            ref[dest] = semantics(ref, txt)
    nl = ns = 0
    for step in code:
        kind = step[0]
        if kind in ('origload', 'load', 'store'):
            _, x, r, m = step
            assert r in sym and m in msym, step
            if kind == 'store':
                assert sym[r] == x, f"store {x} : {r} contient {sym[r]}"
                msym[m], mnum[m] = x, num[r]
                ns += 1
            else:
                assert msym[m] == x, f"load {x} : {m} contient {msym[m]}"
                sym[r], num[r] = x, mnum[m]
                nl += kind == 'load'
        elif kind == 'op':
            _, txt, rd, srcs = step
            vals = {}
            for v, r in srcs:
                assert sym[r] == v, f"{txt} : {r} contient {sym[r]} au lieu de {v}"
                vals[v] = num[r]
            dest = txt.split('=')[0].strip()
            sym[rd], num[rd] = dest, semantics(vals, txt)
            assert num[rd] == ref[dest]
        elif kind == 'ret':
            _, h, r = step
            assert sym[r] == h and num[r] == ref['h']
    return nl, ns, num, ref


def show_code(code):
    lines = []
    for step in code:
        k = step[0]
        if k == 'origload':
            lines.append(f"{step[1]} = load {step[3]}".ljust(16) + f"{step[2]} <- {step[3]}")
        elif k == 'load':
            lines.append(f"{step[1]} = load {step[3]}".ljust(16) + f"{step[2]} <- {step[3]}   (+1 load)")
        elif k == 'store':
            lines.append(f"store {step[1]} {step[3]}".ljust(16) + f"{step[3]} <- {step[2]}   (+1 store)")
        elif k == 'op':
            txt, rd, srcs = step[1], step[2], step[3]
            rhs = txt.split('=')[1]
            for v, r in srcs:
                rhs = rhs.replace(f" {v}", f" {r}")
            lines.append(f"{txt}".ljust(16) + f"{rd} <-{rhs}")
        else:
            lines.append(f"ret {step[1]}".ljust(16) + f"ret {step[2]}")
    return lines


def location_bars(code):
    """Barres de l'enonce : pour chaque emplacement (R0, R1, m0..m6), segments
    [pas d'ecriture, pas de derniere lecture DANS cet emplacement] de chaque valeur.
    Pas 0 = etat initial (a dans m0, b dans m1)."""
    locs = ['R0', 'R1'] + [f"m{i}" for i in range(7)]
    cur = {l: None for l in locs}          # (valeur, pas d'ecriture, pas de derniere lecture)
    segs = {l: [] for l in locs}
    cur['m0'], cur['m1'] = ['a', 0, None], ['b', 0, None]

    def write(l, v, t):
        if cur[l] and cur[l][2] is not None:
            segs[l].append(tuple(cur[l]))
        cur[l] = [v, t, None]

    def read(l, v, t):
        assert cur[l] and cur[l][0] == v, (l, v, t)
        cur[l][2] = t
    for t, step in enumerate(code, 1):
        k = step[0]
        if k in ('origload', 'load'):
            read(step[3], step[1], t)
            write(step[2], step[1], t)
        elif k == 'store':
            read(step[2], step[1], t)
            write(step[3], step[1], t)
        elif k == 'op':
            for v, r in step[3]:
                read(r, v, t)
            write(step[2], step[1].split('=')[0].strip(), t)
        else:
            read(step[2], step[1], t)
    for l in locs:
        if cur[l] and cur[l][2] is not None:
            segs[l].append(tuple(cur[l]))
    used = [l for l in locs if segs[l]]
    lines = show_code(code)
    print('  pas  instruction       ' + ''.join(l.ljust(6) for l in used))
    for t in range(0, len(code) + 1):
        row = []
        for l in used:
            here = [(v, a, b) for v, a, b in segs[l] if a <= t <= b]
            if len(here) == 2:
                (v1, _, _), (v2, _, _) = sorted(here, key=lambda x: x[1])
                cell = f"{v1}>{v2}"
            elif here:
                v, a, b = here[0]
                cell = v + ('┬' if t == a else '┴' if t == b else '│')
            else:
                cell = '.'
            row.append(cell.ljust(6))
        ins = 'etat initial' if t == 0 else lines[t - 1].split('  ')[0]
        print(f"  {t:>3}  {ins:<17} " + ''.join(row))
    for l in used:
        print(f"  {l} : " + ' ; '.join(f"{v} [{a},{b}]" for v, a, b in segs[l]))
    print("  (barre = de l'ecriture dans l'emplacement a la derniere lecture DANS cet emplacement ;"
          " x>y : x lu une derniere fois et y ecrit au meme pas ; m4, m5, m6 inutilises)")
    return segs


def trace_table(code):
    """Contenu de R0, R1 et des cases utilisees apres chaque pas (pour les barres)."""
    sym = {'R0': '.', 'R1': '.'}
    mem = {f"m{i}": '.' for i in range(7)}
    mem['m0'], mem['m1'] = 'a', 'b'
    rows = []
    for step, line in zip(code, show_code(code)):
        k = step[0]
        if k in ('origload', 'load'):
            sym[step[2]] = step[1]
        elif k == 'store':
            mem[step[3]] = step[1]
        elif k == 'op':
            sym[step[2]] = step[1].split('=')[0].strip()
        rows.append((line.split('  ')[0], dict(sym), dict(mem)))
    print('  pas instruction        R0  R1  | m0 m1 m2 m3 m4 m5 m6')
    for i, (ins, s, m) in enumerate(rows, 1):
        print(f"  {i:>3} {ins:<17} {s['R0']:<3} {s['R1']:<3} | " + ' '.join(f"{m[c]:<2}" for c in sorted(m)))


# ------------------------------------------------------------------------ main
def section(t):
    print()
    print('=' * 100)
    print(t)
    print('=' * 100)


def main():
    print("TD5 Compilation - section 5.3 - verification des exercices 5 et 6")
    print("Convention : v vivante en p_i (juste apres la ligne i) ssi def(v) <= i < derniere lecture(v).")

    section("Exercice 5 : intervalles de vie et interferences")
    iv, pts, mx = print_liveness(PROG)
    edges = interferences(PROG)
    print(f"  Interferences ({len(edges)} aretes) : " + ' '.join(f"{u}-{v}" for u, v in edges))
    non = [(u, v) for u, v in itertools.combinations(sorted(iv), 2) if (u, v) not in edges]
    print(f"  Paires sans interference ({len(non)}) : " + ' '.join(f"{u}-{v}" for u, v in non))
    n, m, c = topo_min_maxlive(PROG)
    print(f"  Tous les ordres valides du bloc : {n} ; max-vivants minimal = {m} (atteint par {c} ordres)"
          " -> meme en reordonnant, 2 registres ne suffisent pas sans spill")

    section("Exercice 5 q1 : linear scan (bin packing glouton) avec 6 registres R0..R5")
    regs6 = [f"R{i}" for i in range(6)]
    alloc, spilled, log = linear_scan(PROG, regs6)
    for line in log:
        print('  ' + line)
    print(f"  Allocation : " + ', '.join(f"{v}->{r}" for v, r in alloc.items()))
    print(f"  Registres utilises : {sorted(set(alloc.values()))} ({len(set(alloc.values()))}) ; spills : {spilled}")
    print("  Verification : aucun registre ne porte deux intervalles qui se chevauchent -> OK (assert)")
    print_bars(PROG, alloc, regs6)
    for r in regs6:
        vs = [v for v in alloc if alloc[v] == r]
        if vs:
            print(f"  bac {r} : " + ' puis '.join(f"{v} [{iv[v][0]},{iv[v][1]}]" for v in vs))
    # verification numerique de l'allocation a 6 registres
    regval = {}
    vals = {'a': 6, 'b': 2}
    for txt, dest, srcs, kind in PROG:
        if kind == 'load':
            regval[alloc[dest]] = vals[dest]
        elif kind == 'op':
            loc = {s: regval[alloc[s]] for s in srcs}
            vals[dest] = semantics(vals, txt)
            assert semantics(loc, txt) == vals[dest]
            regval[alloc[dest]] = vals[dest]
        else:
            assert regval[alloc['h']] == vals['h']
    print(f"  Simulation numerique (m0=6, m1=2) avec les registres alloues : h = {regval[alloc['h']]} -> OK")
    for k in (3, 2):
        al, sp, lg = linear_scan(PROG, [f"R{i}" for i in range(k)])
        print(f"  Linear scan avec {k} registres : spills = {sp or 'aucun'}"
              + (f" ; {lg[[i for i, l in enumerate(lg) if 'spill' in l][0]]}" if sp else ''))

    section("Exercice 6 : 2 registres - recherche exhaustive du nombre minimal de load/store inseres")
    for name, key in (("min total puis min stores", lambda c, l, s: (c, s)),
                      ("min total puis min loads", lambda c, l, s: (c, l))):
        (c, l, s), path = dijkstra(key)
        print(f"  [{name}] cout minimal = {c} ({l} load(s) + {s} store(s))")
        print('     ' + ' | '.join(path))
    best = c
    n, splits = count_optimal(best)
    print(f"  Nombre de solutions optimales (suites d'operations, choix de registre compris) : {n}")
    print(f"  Repartitions (loads, stores) des solutions optimales : {splits}")
    n1, sp1 = count_optimal(best - 1)
    print(f"  Solutions de cout {best - 1} : {n1} -> le minimum {best} est PROUVE (dans le modele)")
    for k in (6, 7):
        print(f"  Vivants a l'entree de la ligne {k} ({PROG[k-1][0]}) : {sorted(pts[k - 1])}"
              f" ; operandes : {PROG[k-1][2]}")
    print(f"  Vivants juste apres la ligne 3 : {sorted(pts[3])}")

    section("Exercice 6 : allocateur glouton (prochaine lecture la plus lointaine, store seulement si besoin)")
    g = greedy_furthest()
    for line in show_code(g):
        print('     ' + line)
    nl, ns, num, ref = simulate(g)
    print(f"  Simulation symbolique + numerique : OK ; {nl} load(s) + {ns} store(s) inseres = {nl + ns}")

    section("Exercice 6 : solution retenue pour le corrige (verifiee pas a pas)")
    sol = [
        ('origload', 'a', 'R0', 'm0'),
        ('origload', 'b', 'R1', 'm1'),
        ('op', 'c = a + b', 'R0', [('a', 'R0'), ('b', 'R1')]),   # a quitte R0 : il reste dans m0
        ('op', 'd = 4 * c', 'R0', [('c', 'R0')]),
        ('op', 'e = b + 1', 'R1', [('b', 'R1')]),
        ('store', 'd', 'R0', 'm2'),                               # spill de d
        ('load', 'a', 'R0', 'm0'),                                # rechargement de a
        ('op', 'f = e + a', 'R0', [('e', 'R1'), ('a', 'R0')]),
        ('store', 'f', 'R0', 'm3'),                               # spill de f
        ('load', 'd', 'R0', 'm2'),
        ('op', 'g = d / e', 'R0', [('d', 'R0'), ('e', 'R1')]),
        ('load', 'f', 'R1', 'm3'),
        ('op', 'h = f - g', 'R0', [('f', 'R1'), ('g', 'R0')]),
        ('ret', 'h', 'R0'),
    ]
    for line in show_code(sol):
        print('     ' + line)
    for m0, m1 in ((6, 2), (10, 3), (-7, 5)):
        nl, ns, num, ref = simulate(sol, m0, m1)
        print(f"  m0={m0}, m1={m1} : h calcule = {num['R0']}, attendu = {ref['h']} -> OK")
    print(f"  Inseres : {nl} load(s) + {ns} store(s) = {nl + ns} ; acces memoire au total "
          f"(avec les 2 load d'origine) : {nl + ns + 2}")
    trace_table(sol)
    print('  Barres (comme les colonnes de la figure de l\'enonce) :')
    location_bars(sol)

    section("Exercice 6 : comparaison avec 'tout en memoire' (a..g dans m0..m6, h rendu directement)")
    cellof = {'a': 'm0', 'b': 'm1', 'c': 'm2', 'd': 'm3', 'e': 'm4', 'f': 'm5', 'g': 'm6'}
    naive = []
    for txt, dest, srcs, kind in PROG:
        if kind == 'load':
            continue        # a et b sont deja dans m0, m1 : on les chargera a chaque lecture
        if kind == 'ret':
            naive.append(('ret', 'h', 'R0'))
            continue
        rs = []
        for j, s in enumerate(srcs):
            r = f"R{j}"
            naive.append(('load', s, r, cellof[s]))
            rs.append((s, r))
        naive.append(('op', txt, 'R0', rs))
        if dest != 'h':
            naive.append(('store', dest, 'R0', cellof[dest]))
    nl, ns, num, ref = simulate(naive)
    print(f"  {nl} load(s) + {ns} store(s) = {nl + ns} acces memoire (contre 7 pour la solution retenue)")
    for line in show_code(naive):
        print('     ' + line)


if __name__ == '__main__':
    main()
