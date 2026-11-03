package httpclient

import "changeme/internal/models"

type HttpClient struct{}

func NewHttpClient() *HttpClient{
	return &HttpClient{}
}

func (h *HttpClient) DoRequest(request *models.Request) (*models.Response, error) {
	return nil, nil;
}