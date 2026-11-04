package parsers

import (
	"changeme/internal/models"
	"go/token"
)

var _ Parser = (*ChiParser)(nil)

type ChiParser struct {
	fset *token.FileSet
}

func NewChiParser() *ChiParser {
	return &ChiParser{
		fset: token.NewFileSet(),
	}
}

// Execute implements [Parser].
func (c *ChiParser) Execute(source string) ([]models.Endpoint, error) {
	panic("unimplemented")
}
