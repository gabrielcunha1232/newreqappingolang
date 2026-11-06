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

type GinParser struct{
	baseParser BaseParser
}

func NewGinParser() *GinParser {
	return &GinParser{
		*NewBaseParser(verbosChi),
	}
}