package parsers

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

type FiberParser struct {
	baseParser BaseParser
}

func NewFiberParser() *FiberParser {
	return &FiberParser{
		*NewBaseParser(verbosFiber),
	}
}
