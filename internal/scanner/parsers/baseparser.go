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

var _ Parser = (*BaseParser)(nil)

type BaseParser struct {
	fset   *token.FileSet
	verbos map[string]string
}

type nodeGroup struct {
	Prefix string
	ReceiverName string
}

func NewBaseParser(verbos map[string]string) *BaseParser {
	return &BaseParser{
		fset:   token.NewFileSet(),
		verbos: verbos,
	}
}

// Execute implements [Parser].
func (b *BaseParser) Execute(source string) ([]models.Endpoint, error) {
	info, err := os.Stat(source)
	if err != nil {
		return nil, err
	}

	if !info.IsDir(){
		return b.extractEndpointsFromFile(source)
	}

	return b.scanDir(source)
}

func (b *BaseParser) scanDir(dir string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || !d.IsDir() || strings.HasPrefix(d.Name(), ".") || d.Name() == "vendor" {
			return err
		}

		pkgs, err := parser.ParseDir(b.fset, path, nil, parser.AllErrors)
		if err != nil {
			return nil
		}

		for _, pkg := range pkgs {
			for  arquivoNome := range pkg.Files {
				achados, _ := b.extractEndpointsFromFile(arquivoNome)
				endpoints = append(endpoints, achados...)
			}
		}

		return nil
	})

	return endpoints, err
}

func (b *BaseParser) extractEndpointsFromFile(filePath string) ([]models.Endpoint, error){
	fileAst, err := parser.ParseFile(b.fset, filePath, nil, parser.AllErrors)
	if err != nil {
		return nil, err
	}

	var endpoints []models.Endpoint

	groups := collectGroups(fileAst)

	ast.Inspect(fileAst, func(n ast.Node) bool {
		if endpoint, ok := b.inspectNode(n, filePath, groups); ok {
			endpoints = append(endpoints, endpoint)
		}
		return true
	})

	return endpoints, nil
}

func (b *BaseParser) inspectNode(n ast.Node, sourceFile string, groups map[string]nodeGroup) (models.Endpoint, bool) {
	callExpr, ok := n.(*ast.CallExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	selector, ok := callExpr.Fun.(*ast.SelectorExpr)
	if !ok {
		return models.Endpoint{}, false
	}

	verboHttp, existe := b.verbos[strings.ToUpper(selector.Sel.Name)]
	if !existe || len(callExpr.Args) == 0 {
		return models.Endpoint{}, false
	}

	ident, ok := selector.X.(*ast.Ident)
	var prefixoTotal string
	if ok {
		prefixoTotal = resolvePrefix(ident.Name, groups)
	}


	if basicLit, ok := callExpr.Args[0].(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
		rotaAtual := strings.Trim(basicLit.Value, "\"`")

		return models.Endpoint{
			Method: verboHttp,
			Path: prefixoTotal + rotaAtual,
			SourceFile: sourceFile,
		}, true
	}

	return models.Endpoint{}, false
}

func resolvePrefix(v string, m map[string]nodeGroup) string {
	info, encontrado := m[v]
	if !encontrado {
		return ""
	}
	prefixoPai := resolvePrefix(info.ReceiverName, m)
	return prefixoPai + info.Prefix
}

func collectGroups(fileAst *ast.File) map[string]nodeGroup{
	groups := map[string]nodeGroup{}

	ast.Inspect(fileAst, func(n ast.Node) bool {
		assign, ok := n.(*ast.AssignStmt)
		if !ok {
			return true
		}

		if len(assign.Lhs) != 1 || len(assign.Rhs) != 1  {
			return true
		}
		
		callExpr, ok := assign.Rhs[0].(*ast.CallExpr)
		if !ok {
			return true
		}

		selector, ok := callExpr.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		if selector.Sel.Name != "Group" {
			return true
		}
		
		paiIdent, ok := selector.X.(*ast.Ident)
		if !ok {
			return true
		}

		novaVariavelIdent, ok := assign.Lhs[0].(*ast.Ident)
		if !ok {
			return true
		}

		if len(callExpr.Args) == 0 {
			return true
		}

		basicLit, ok := callExpr.Args[0].(*ast.BasicLit)
		if !ok || basicLit.Kind != token.STRING {
			return true
		}

		fragmentoPath := strings.Trim(basicLit.Value, "\"`")

		groups[novaVariavelIdent.Name] = nodeGroup{
			ReceiverName: paiIdent.Name,
			Prefix:       fragmentoPath,
		}

		return true
	})

	return groups
}