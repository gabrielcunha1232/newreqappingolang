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

var verbosGin = map[string]string {
		"GET": "GET",
		"POST":    "POST",
		"PUT":     "PUT",
		"DELETE":  "DELETE",
		"PATCH":   "PATCH",
		"OPTIONS": "OPTIONS",
		"HEAD":    "HEAD",
		"ANY":     "ANY",
	}

var _ Parser = (*GinParser)(nil)

type GinParser struct{
	fset *token.FileSet
}

func NewGinParser() *GinParser {
	return &GinParser{
		fset: token.NewFileSet(),
	}
}

func (g *GinParser) Execute(source string) ([]models.Endpoint, error) {
	info, err:= os.Stat(source)
	if err != nil {
		return nil, err
	}

	if !info.IsDir() {
		return g.extractEndpointsFromFile(source)
	}

	return g.scanDir(source)
}


func(g *GinParser) scanDir(dir string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() || strings.HasPrefix(d.Name(), ".") || d.Name() == "vendor" {
			return err
		}

		pkgs, err := parser.ParseDir(g.fset, path, nil, parser.AllErrors)
		if err != nil {
			return nil
		}

		for _, pkg := range pkgs {
			for arquivoNome := range pkg.Files {
				achados, _ := g.extractEndpointsFromFile(arquivoNome)
				endpoints = append(endpoints, achados...)
			}
		}

		return nil
	})

	return endpoints, err
}

func (g *GinParser) extractEndpointsFromFile(filePath string) ([]models.Endpoint, error) {
	fileAst, err := parser.ParseFile(g.fset, filePath, nil, parser.AllErrors)
	if err != nil {
		return nil, err
	}

	var endpoints []models.Endpoint
	ast.Inspect(fileAst, func(n ast.Node) bool{
		if endpoint, ok := g.inspectNode(n, filePath); ok {
			endpoints = append(endpoints, endpoint)
		}

		return true
	})
	
	return endpoints, nil
}

func (g *GinParser) inspectNode(n ast.Node, sourceFile string) (models.Endpoint, bool) {
	callExpr, ok := n.(*ast.CallExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	selector, ok := callExpr.Fun.(*ast.SelectorExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	verboHttp, existe := verbosGin[strings.ToUpper(selector.Sel.Name)]
	if !existe || len(callExpr.Args) == 0  {
		return models.Endpoint{}, false
	}

	if basicLit, ok := callExpr.Args[0].(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
		return models.Endpoint{
			Method: verboHttp,
			Path: strings.Trim(basicLit.Value, "\"`"),
			SourceFile: sourceFile,
		}, true
	}

	return models.Endpoint{}, false
}