package parsers

import (
	"changeme/internal/models"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

var verbosChi = map[string]string{
	"GET":     "GET",
	"POST":    "POST",
	"PUT":     "PUT",
	"DELETE":  "DELETE",
	"PATCH":   "PATCH",
	"OPTIONS": "OPTIONS",
	"HEAD":    "HEAD",
	"ANY":     "ANY",
}

var _ Parser = (*ChiParser)(nil)

type ChiParser struct {
	BaseParser
}

func NewChiParser() *ChiParser {
	return &ChiParser{
		*NewBaseParser(verbosChi),
	}
}

func (c *ChiParser) Execute(source string) ([]models.Endpoint, error) {
	info, err := os.Stat(source)
	if err != nil {
		return nil, err
	}

	if !info.IsDir() {
		return c.extractEndpointsFromFile(source)
	}

	return c.scanDir(source)

}

func (c *ChiParser) scanDir(dir string) ([]models.Endpoint, error) {
	
	var endpoints []models.Endpoint
	
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() || strings.HasPrefix(d.Name(), ".") || d.Name() == "vendor" {
			return err
		}

		pkgs, err := parser.ParseDir(c.fset, path, nil, parser.AllErrors)
		if err != nil {
			return nil
		}

		for _, pkg := range pkgs {
			for arquivoNome := range pkg.Files {
				achados, _ := c.extractEndpointsFromFile(arquivoNome)
				endpoints = append(endpoints, achados...)
			}
		}

		return nil
	})

	return endpoints, err
}


func (c *ChiParser) extractEndpointsFromFile(filePath string) ([]models.Endpoint, error) {
	fileAst, err := parser.ParseFile(c.fset, filePath, nil, parser.AllErrors)
	if err != nil {
		return nil, err
	}

	return c.walkNode(fileAst, "", filePath), nil
}


func (c *ChiParser) walkNode(node ast.Node, prefix string, sourceFile string) []models.Endpoint {
	var endpoints []models.Endpoint

	ast.Inspect(node, func(n ast.Node) bool {
		if n == node {
			return true
		}

		callExpr, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}

		selector, ok := callExpr.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		nomeMetodo := selector.Sel.Name

		if verboHttp, existe := c.verbos[strings.ToUpper(nomeMetodo)]; existe {
			if len(callExpr.Args) > 0 {
				if basicLit, ok := callExpr.Args[0].(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
					rotaAtual := strings.Trim(basicLit.Value, "\"`")

					fullPath := c.joinPaths(prefix, rotaAtual)

					endpoints = append(endpoints, models.Endpoint{
						Method: verboHttp,
						Path: fullPath,
						SourceFile: sourceFile,
					})
				}
			}

			return true
		}

		if nomeMetodo == "Route" && len(callExpr.Args) >= 2 {
			basicLit, okSegment := callExpr.Args[0].(*ast.BasicLit)
			funcLit, okFuncao:= callExpr.Args[1].(*ast.FuncLit)

			if okSegment && okFuncao && basicLit.Kind == token.STRING {
				novoSegmento := strings.Trim(basicLit.Value, "\"`")
				novoPrefixo := c.joinPaths(prefix, novoSegmento)

				subEndpoints := c.walkNode(funcLit.Body, novoPrefixo, sourceFile)
				endpoints = append(endpoints, subEndpoints...)

				return false
			}
		}

		return true
	})	

	return endpoints
}

func (c *ChiParser) joinPaths(base, suffix string) string {
	if base == "" {
		if !strings.HasPrefix(suffix, "/") {
			return "/" + suffix
		}

		return suffix
	}

	base = strings.TrimSuffix(base, "/")
	suffix = strings.TrimPrefix(suffix, "/")

	return base + "/" + suffix
}