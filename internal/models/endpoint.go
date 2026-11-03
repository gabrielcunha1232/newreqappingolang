package models

type Request struct {
	Method string `json:"method"`
	URL string `json:"url"`
	Headers map[string]string `json:"headers"`
	Body string `json:"body"`
}


type Response struct {
	StatusCode int `json:"status_code"`
	TimeSpent int64 `json:"time_spent"`
	Size int `json:"size"`
	Body string `json:"body"`
}

type Endpoint struct {
	Method string `json:"method"`
	Path string `json:"path"`
	SourceFile string `json:"source_file"`
}