package parsers

import "changeme/internal/models"

type Parser interface {
	Execute(source string) ([]models.Endpoint, error)
}