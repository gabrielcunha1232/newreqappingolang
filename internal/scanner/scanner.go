package scanner

import (
	"changeme/internal/models"
	"changeme/internal/scanner/parsers"
	"errors"
)

type Scanner struct {
	dir string
}

func NewScanner(dir string) *Scanner {
	return &Scanner{
		dir: dir,
	}
}

func (s *Scanner) Scan() ([]models.Endpoint, error) {
	language := &Language{}
	err := language.DetectAndSetFramework(s.dir)
	if err != nil {
		return nil, err
	}

	if language.Framework == FrameworkUnknown {
		return nil, errors.New("Não foi detectado o framework e os endpoints. Preencha manualmente por favor")
	}

	parsersMap := map[Framework]parsers.Parser{
		FrameworkGin:   parsers.NewGinParser(),
		FrameworkFiber: parsers.NewFiberParser(),
		FrameworkEcho:  parsers.NewEchoParser(),
		FrameworkChi:   parsers.NewChiParser(),
		FrameworkSpring: parsers.NewSpringParser(),
	}

	initparsers, exists := parsersMap[language.Framework]
	if !exists || initparsers == nil{
		return nil, errors.New("Framework não incluso")
	}

	return initparsers.Execute(s.dir)
}