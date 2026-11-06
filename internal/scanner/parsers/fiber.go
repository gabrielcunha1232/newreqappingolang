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

var verbosFiber = map[string]string {
	"GET": "GET",
	"POST":    "POST",
	"PUT":     "PUT",
	"DELETE":  "DELETE",
	"PATCH":   "PATCH",
	"OPTIONS": "OPTIONS",
	"HEAD":    "HEAD",
	"ANY":     "ANY",
}

var _ Parser = (*FiberParser)(nil)

type FiberParser struct {
	fset *token.FileSet
}

func NewFiberParser() *FiberParser {
	return &FiberParser{
		fset: token.NewFileSet(),
	}
}

// Execute implements [Parser].
func (f *FiberParser) Execute(source string) ([]models.Endpoint, error) {
	info, err := os.Stat(source)
	if err != nil {
		return nil, err
	}

	if !info.IsDir(){
		return f.extractEndpointsFromFile(source)
	}

	return f.scanDir(source)
}

func (f *FiberParser) scanDir(dir string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() || strings.HasPrefix(d.Name(), ".") || d.Name() == "vendor" {
			return err
		}

		pkgs, err := parser.ParseDir(f.fset, path, nil, parser.AllErrors)
		if err != nil {
			return nil
		}

		for _, pkg := range pkgs {
			for  arquivoNome := range pkg.Files {
				achados, _ := f.extractEndpointsFromFile(arquivoNome)
				endpoints = append(endpoints, achados...)
			}
		}

		return nil
	})

	return endpoints, err
}


func (f *FiberParser) extractEndpointsFromFile(filePath string) ([]models.Endpoint, error){
	fileAst, err := parser.ParseFile(f.fset, filePath, nil, parser.AllErrors)
	if err != nil {
		return nil, err
	}

	var endpoints []models.Endpoint

	ast.Inspect(fileAst, func(n ast.Node) bool {
		if endpoint, ok := f.inspectNode(n, filePath); ok {
			endpoints = append(endpoints, endpoint)
		}
		return true
	})

	return endpoints, nil
}


func (f *FiberParser) inspectNode(n ast.Node, sourceFile string) (models.Endpoint, bool) {
	callExpr, ok := n.(*ast.CallExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	selector, ok := callExpr.Fun.(*ast.SelectorExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	verboHttp, existe := verbosFiber[strings.ToUpper(selector.Sel.Name)]
	if !existe || len(callExpr.Args) == 0 {
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
