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

type ChiParser struct {
	baseParser BaseParser
}

func NewChiParser() *ChiParser {
	return &ChiParser{
		*NewBaseParser(verbosChi),
	}
}