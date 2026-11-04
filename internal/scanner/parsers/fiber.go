package parsers

import (
	"changeme/internal/models"
	"go/token"
)

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
	panic("unimplemented")
}
