package parsers

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
	BaseParser
}

func NewGinParser() *GinParser {
	return &GinParser{
		*NewBaseParser(verbosGin),
	}
}