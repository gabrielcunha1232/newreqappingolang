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

var _ Parser = (*FiberParser)(nil)

type FiberParser struct {
	BaseParser
}

func NewFiberParser() *FiberParser {
	return &FiberParser{
		*NewBaseParser(verbosFiber),
	}
}
