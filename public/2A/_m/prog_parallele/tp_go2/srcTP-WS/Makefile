# TP « vol de travail en Go »
#   make          compile ./mandel
#   make race     compile ./mandel-race, avec le détecteur d'accès concurrents
.PHONY: all race clean
all: mandel
mandel: *.go go.mod
	go build -o $@ .
race: mandel-race
mandel-race: *.go go.mod
	go build -race -o $@ .
clean:
	$(RM) mandel mandel-race *.png
