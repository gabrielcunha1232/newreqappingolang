package main

import (
	"changeme/internal/httpclient"
	"changeme/internal/models"
)

type HttpClientService struct{
	client *httpclient.HttpClient
}

func NewHttpClientService() *HttpClientService{
	return &HttpClientService{
		client: httpclient.NewHttpClient(),
	}
}

func (s *HttpClientService) DoRequest(request *models.Request) (*models.Response, error){
	return s.client.DoRequest(request)
}