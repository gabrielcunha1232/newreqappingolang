package main

import (
	"changeme/internal/scanner/parsers"
	"testing"
)

func TestGinParser(t *testing.T) {
    parserGin := parsers.NewGinParser()
    endpoints, err := parserGin.Execute(`C:\Projetos\GOLANG\teste`)
    if err != nil {
        t.Fatalf("erro ao analisar: %v", err)
    }

    for _, endpoint := range endpoints {
        t.Logf("%s %s", endpoint.Method, endpoint.Path)
    }
}
