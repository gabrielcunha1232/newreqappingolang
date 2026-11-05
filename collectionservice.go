package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

type CollectionService struct {
	mu sync.Mutex
}

func NewCollectionService() *CollectionService {
	return &CollectionService{}
}

func (s *CollectionService) filePath() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "newpostman", "collections.json"), nil
}

func (s *CollectionService) Load() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	path, err := s.filePath()
	if err != nil {
		return "", err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil
		}
		return "", err
	}

	if !json.Valid(data) {
		return "", nil
	}

	return string(data), nil
}

// Save grava o payload de forma atômica (arquivo temporário + rename).
func (s *CollectionService) Save(payload string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if payload == "" {
		payload = "{}"
	}
	if !json.Valid([]byte(payload)) {
		return errors.New("payload inválido: não é um JSON")
	}

	path, err := s.filePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(payload), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
