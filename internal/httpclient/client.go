package httpclient

import (
	"bytes"
	"changeme/internal/models"
	"io"
	"net/http"
	"time"
)

type HttpClient struct{
	client *http.Client
}

func NewHttpClient() *HttpClient{
	return &HttpClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (h *HttpClient) DoRequest(request *models.Request) (*models.Response, error) {

	var bodyReader io.Reader
	if request.Body != "" {
		bodyReader = bytes.NewBufferString(request.Body)
	}

	req, err := http.NewRequest(request.Method, request.URL, bodyReader)
	if err != nil {
		return nil, err
	}

	for key, value := range request.Headers {
		req.Header.Set(key, value)
	}

	startTime := time.Now()
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	timeSpent := time.Since(startTime).Milliseconds()

	respBodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	response := &models.Response{
		StatusCode: resp.StatusCode,
		TimeSpent: timeSpent,
		Size: len(respBodyBytes),
		Body: string(respBodyBytes),
	}

	return response, nil
}