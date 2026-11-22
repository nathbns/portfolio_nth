/*****************************************************
 * Copyright Grégory Mounié 2008-2026                *
 *           Simon Nieuviarts 2002-2009              *
 * This code is distributed under the GLPv3 licence. *
 * Ce code est distribué sous la licence GPLv3+.     *
 *****************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <libguile.h>
#include <readline/history.h>
#include <readline/readline.h>

#include <unistd.h>
#include <sys/wait.h>

#include "parsecmd.h"

constexpr int VARIANTE = 0;
constexpr char VARIANTE_STRING[] = "PAS D'OPTIONS";

void lancer_commande(struct cmdline *l) {
    char **cmd = l->seq[0];
    if(cmd == NULL) return; // ligne vide
    
    pid_t pid = fork();
    if(pid == -1) { // erreur
    	perror("fork");
    } else if(pid == 0) { // le fils
    	execvp(cmd[0], cmd);
	perror(cmd[0]);
	exit(1);
    } else { // le pere
	if(!l->bg) { // pas de &: on attend
    		int status;
		waitpid(pid, &status, 0);
	}
	// avec &: on attend pas, on reaffiche le prompt
    }
}

int scheme_implem_executer(char *line) {
  /* Question 3: NOT THE FIRST QUESTION CODE */ 
  /* Insert your code to execute the command line
   * identically to the standard execution scheme:
   * parsecmd, then fork+execvp, for a single command.
   * pipe and i/o redirection are not required.
   */
   //printf("Question 3, not implemented yet: can not execute %s\n", line);
   struct cmdline *l = parsecmd(&line);
   if(l == NULL || l->err)
	   return -1;
   lancer_commande(l);
  /* Remove this line when using parsecmd as it will free it */
  //free(line);

  return 0;
}

// DO NOT EDIT
SCM executer_wrapper(SCM x) {
  return scm_from_int(scheme_implem_executer(scm_to_locale_stringn(x, 0)));
}

// DO NOT EDIT, until late
void terminate(char *line) {
  clear_history();

  if (line)
    free(line);
  printf("exit\n");
  exit(0);
}

int main() {
  printf("Variante %d: %s\n", VARIANTE, VARIANTE_STRING);

  /* lancement de Guile, l'interpréteur Scheme/Javascript */
  scm_init_guile();
  /* enregistrer "executer" function in scheme */
  scm_c_define_gsubr("executer", 1, 0, 0, executer_wrapper);

  // MAIN SHELL LOOP at the first questions, possible refactorization
  // later if needed
  while (1) {
    struct cmdline *l;
    char *line = 0;
    int i, j;
    char *prompt = "ensishell>";

    /* Readline use some internal memory structure that
       can not be cleaned at the end of the program. Thus
       one memory leak per command seems unavoidable yet */
    line = readline(prompt);
    if (line == 0 || !strncmp(line, "exit", 4)) {
      terminate(line);
    }

    add_history(line);

    /* The line is a scheme command */
    if (line[0] == '(') {
      char catchligne[strlen(line) + 256];
      sprintf(catchligne,
              "(catch #t (lambda () %s) (lambda (key . parameters) (display "
              "\"mauvaise expression/bug en scheme\n\")))",
              line);
      scm_eval_string(scm_from_locale_string(catchligne));
      free(line);
      continue;
    }

    /* parsecmd free line and set it up to 0 */
    l = parsecmd(&line);

    /* If input stream closed, normal termination */
    if (!l) {

      terminate(0);
    }

    if (l->err) {
      /* Syntax error, read another command */
      printf("error: %s\n", l->err);
      continue;
    }

    if (l->in)
      printf("in: %s\n", l->in);
    if (l->out)
      printf("out: %s\n", l->out);
    if (l->bg)
      printf("background (&)\n");

    /* Display each command of the pipe */
    for (i = 0; l->seq[i] != 0; i++) {
      char **cmd = l->seq[i];
      printf("seq[%d]: ", i);
      for (j = 0; cmd[j] != 0; j++) {
        printf("'%s' ", cmd[j]);
      }
      printf("\n");
    }

    // QUESTION 1
    lancer_commande(l);
  }
}
