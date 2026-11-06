package parsers

var verbosChi = map[string]string {
	"GET": "GET",
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