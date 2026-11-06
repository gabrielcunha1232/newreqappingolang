package parsers

var verbosEcho = map[string]string {
	"GET": "GET",
	"POST":    "POST",
	"PUT":     "PUT",
	"DELETE":  "DELETE",
	"PATCH":   "PATCH",
	"OPTIONS": "OPTIONS",
	"HEAD":    "HEAD",
	"ANY":     "ANY",
}

type EchoParser struct {
	baseParser BaseParser
}

func NewEchoParser() *EchoParser {
	return &EchoParser{
		*NewBaseParser(verbosEcho),
	}
}