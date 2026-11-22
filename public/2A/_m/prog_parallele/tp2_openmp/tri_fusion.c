// Tri par fusion, à paralléliser avec des tâches OpenMP.
//
// Usage : ./tri_fusion [version] [n] [seuil]
//   version : seq | v1 | v2 | v3
//   n       : nombre d'entiers à trier (défaut : 2^24)
//   seuil   : taille en dessous de laquelle on ne crée plus de tâches
//             (défaut : 10000)
//
// Le programme vérifie que le tableau est trié et que ses éléments n'ont pas
// changé (somme de contrôle), puis affiche une ligne :
//   version  n  seuil  threads  temps
//
// Vous pouvez ajouter vos propres versions dans le tableau « versions »,
// juste avant main.
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <omp.h>

// ---------------------------------------------------------------------------
// Briques séquentielles : à utiliser, pas à modifier
// ---------------------------------------------------------------------------

// Fusionne a[0, na) et b[0, nb), triés, dans dst[0, na + nb).
static void fusion_lineaire(const int *a, size_t na, const int *b, size_t nb,
                            int *dst) {
  size_t i = 0, j = 0, k = 0;
  while (i < na && j < nb)
    dst[k++] = (a[i] <= b[j]) ? a[i++] : b[j++];
  while (i < na)
    dst[k++] = a[i++];
  while (j < nb)
    dst[k++] = b[j++];
}

// Fusionne t[lo, mid) et t[mid, hi) dans tmp[lo, hi), puis recopie le
// résultat dans t[lo, hi). Coût : Θ(hi - lo).
static void fusion(int *t, int *tmp, size_t lo, size_t mid, size_t hi) {
  fusion_lineaire(t + lo, mid - lo, t + mid, hi - mid, tmp + lo);
  memcpy(t + lo, tmp + lo, (hi - lo) * sizeof *t);
}

// Trie t[lo, hi) ; tmp[lo, hi) sert de zone de travail.
static void tri_seq(int *t, int *tmp, size_t lo, size_t hi) {
  if (hi - lo < 2)
    return;
  size_t mid = lo + (hi - lo) / 2;
  tri_seq(t, tmp, lo, mid);
  tri_seq(t, tmp, mid, hi);
  fusion(t, tmp, lo, mid, hi);
}

// Nombre d'éléments de b[0, nb) strictement inférieurs à x (b est trié).
static size_t rang(const int *b, size_t nb, int x) {
  size_t g = 0, d = nb;
  while (g < d) {
    size_t m = g + (d - g) / 2;
    if (b[m] < x)
      g = m + 1;
    else
      d = m;
  }
  return g;
}

static size_t min(size_t a, size_t b) { return a < b ? a : b; }

// ---------------------------------------------------------------------------
// Parties 3.1 et 3.2 : V1 -- récursion en tâches, fusion séquentielle
// ---------------------------------------------------------------------------

static void tri_v1_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if(hi - lo <= seuil) {
  	tri_seq(t, tmp, lo, hi);
	return;
  } 
	
  if (hi - lo < 2) return;
 
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task
  tri_v1_rec(t, tmp, lo, mid, seuil);
#pragma omp task
  tri_v1_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait
  fusion(t, tmp, lo, mid, hi);
}

static void tri_v1(int *t, int *tmp, size_t n, size_t seuil) {
  //(void)seuil; // TODO : à utiliser à la partie 3.2
  // TODO
#pragma omp parallel
#pragma omp single
  tri_v1_rec(t, tmp, 0, n, seuil);
}

// ---------------------------------------------------------------------------
// Partie 3.3 : V2 -- la fusion aussi est parallèle
// ---------------------------------------------------------------------------

// Fusion par dichotomie de a[0, na) et b[0, nb), triés, dans dst.
// L'élément médian x de la plus longue des deux suites a une place finale
// connue : son rang dans a plus son rang dans b. Les éléments situés de part
// et d'autre de x se fusionnent indépendamment.
static void fusion_dicho(const int *a, size_t na, const int *b, size_t nb,
                         int *dst, size_t seuil) {
  if (na < nb) { // a est la plus longue des deux suites
    const int *c = a; a = b; b = c;
    size_t nc = na; na = nb; nb = nc;
  }
  if (na + nb <= seuil) {
    fusion_lineaire(a, na, b, nb, dst);
    return;
  }
  size_t ma = na / 2;
  size_t mb = rang(b, nb, a[ma]);
  dst[ma + mb] = a[ma];
#pragma omp task
  fusion_dicho(a, ma, b, mb, dst, seuil);
#pragma omp task
  fusion_dicho(a + ma + 1, na - ma - 1, b + mb, nb - mb, dst + ma + mb + 1,
               seuil);
}

static void tri_v2_rec(int *t, int *tmp, size_t lo, size_t hi, size_t seuil) {
  if(hi - lo <= seuil) {
  	tri_seq(t, tmp, lo, hi);
	return;
  } 
	
  if (hi - lo < 2) return;
 
  size_t mid = lo + (hi - lo) / 2;
#pragma omp task
  tri_v2_rec(t, tmp, lo, mid, seuil);
#pragma omp task
  tri_v2_rec(t, tmp, mid, hi, seuil);
#pragma omp taskwait
#pragma omp taskgroup
  fusion_dicho(t + lo, mid- lo, t + mid, hi- mid, tmp + lo, seuil);
  //memcpy(t + lo, tmp + lo, (hi - lo) * sizeof *t);
#pragma omp taskloop
  for(size_t i = lo; i < hi; i++) t[i] = tmp[i];
}

static void tri_v2(int *t, int *tmp, size_t n, size_t seuil) {
  //(void)seuil;
  // TODO
#pragma omp parallel
#pragma omp single
  tri_v2_rec(t, tmp, 0, n, seuil);
}

// ---------------------------------------------------------------------------
// Partie 3.4 : V3 -- tri ascendant, graphe de tâches explicite
// ---------------------------------------------------------------------------

// On trie des blocs de taille seuil, puis on fusionne les blocs deux à deux,
// niveau par niveau : blocs de taille seuil, puis 2 seuil, 4 seuil, etc.
static void tri_ascendant(int *t, int *tmp, size_t n, size_t seuil) {
  for (size_t i = 0; i < n; i += seuil)
#pragma omp task depend(out: t[i])
    tri_seq(t, tmp, i, min(i + seuil, n));
  for (size_t w = seuil; w < n; w *= 2)
    for (size_t i = 0; i + w < n; i += 2 * w)
#pragma omp task depend(inout: t[i]) depend(in: t[i+w])
      fusion(t, tmp, i, i + w, min(i + 2 * w, n));
}

static void tri_v3(int *t, int *tmp, size_t n, size_t seuil) {
  // TODO
#pragma omp parallel
#pragma omp single
  tri_ascendant(t, tmp, n, seuil);
}

// ---------------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------------

static void seq(int *t, int *tmp, size_t n, size_t) { tri_seq(t, tmp, 0, n); }

static const struct {
  const char *nom;
  void (*tri)(int *, int *, size_t, size_t);
} versions[] = {
    {"seq", seq}, {"v1", tri_v1}, {"v2", tri_v2}, {"v3", tri_v3},
};
constexpr size_t NB_VERSIONS = sizeof versions / sizeof versions[0];

// Générateur pseudo-aléatoire xorshift64 : reproductible d'une machine à
// l'autre, contrairement à rand().
static uint64_t etat = 88172645463325252u;
static int aleatoire(void) {
  etat ^= etat << 13;
  etat ^= etat >> 7;
  etat ^= etat << 17;
  return (int)(etat >> 33);
}

static uint64_t somme_controle(const int *t, size_t n) {
  uint64_t s = 0;
  for (size_t i = 0; i < n; i++)
    s += (uint64_t)t[i] * (uint64_t)t[i];
  return s;
}

int main(int argc, char *argv[]) {
  const char *nom = argc > 1 ? argv[1] : "seq";
  size_t n = argc > 2 ? strtoull(argv[2], nullptr, 10) : (size_t)1 << 24;
  size_t seuil = argc > 3 ? strtoull(argv[3], nullptr, 10) : 10000;
  if (seuil < 1)
    seuil = 1;

  size_t v = 0;
  while (v < NB_VERSIONS && strcmp(versions[v].nom, nom) != 0)
    v++;
  if (v == NB_VERSIONS) {
    fprintf(stderr, "version inconnue : %s\nversions :", nom);
    for (size_t i = 0; i < NB_VERSIONS; i++)
      fprintf(stderr, " %s", versions[i].nom);
    fprintf(stderr, "\n");
    return EXIT_FAILURE;
  }

  int *t = malloc(n * sizeof *t);
  int *tmp = malloc(n * sizeof *tmp);
  if (t == nullptr || tmp == nullptr) {
    perror("malloc");
    return EXIT_FAILURE;
  }
  for (size_t i = 0; i < n; i++)
    t[i] = aleatoire();
  uint64_t avant = somme_controle(t, n);

  double debut = omp_get_wtime();
  versions[v].tri(t, tmp, n, seuil);
  double duree = omp_get_wtime() - debut;

  for (size_t i = 1; i < n; i++)
    if (t[i - 1] > t[i]) {
      fprintf(stderr, "ERREUR : t[%zu] = %d > t[%zu] = %d\n", i - 1,
              t[i - 1], i, t[i]);
      return EXIT_FAILURE;
    }
  if (somme_controle(t, n) != avant) {
    fprintf(stderr, "ERREUR : les éléments du tableau ont changé\n");
    return EXIT_FAILURE;
  }
  printf("%-8s n=%zu seuil=%zu threads=%d temps=%.3f\n", nom, n, seuil,
         omp_get_max_threads(), duree);
  free(t);
  free(tmp);
  return EXIT_SUCCESS;
}
