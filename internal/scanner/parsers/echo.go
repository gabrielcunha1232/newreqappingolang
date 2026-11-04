package parsers

import (
	"changeme/internal/models"
	"go/token"
)

var _ Parser = (*EchoParser)(nil)

type EchoParser struct {
	fset *token.FileSet
}

func NewEchoParser() *EchoParser {
	return &EchoParser{
		fset: token.NewFileSet(),
	}
}

// Execute implements [Parser].
func (e *EchoParser) Execute(source string) ([]models.Endpoint, error) {
	panic("unimplemented")
}
