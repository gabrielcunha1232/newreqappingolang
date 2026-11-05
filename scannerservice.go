package main

import (
	"changeme/internal/models"
	"changeme/internal/scanner"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type ScannerService struct{}

func NewScannerService() *ScannerService {
	return &ScannerService{}
}

func (s *ScannerService) Scan(dir string) ([]models.Endpoint, error) {
	scanner := scanner.NewScanner(dir)
	return scanner.Scan()
}

// SelectDirectory abre o explorador de arquivos do sistema para o usuário
// escolher um diretório. Retorna o caminho selecionado.
func (s *ScannerService) SelectDirectory() (string, error) {
	app := application.Get()
	if app == nil {
		return "", nil
	}

	dialog := app.Dialog.OpenFile()
	dialog.CanChooseFiles(false)
	dialog.CanChooseDirectories(true)
	dialog.AllowsOtherFileTypes(false)
	dialog.SetTitle("Selecionar diretório do projeto Go")
	dialog.SetButtonText("Selecionar")

	return dialog.PromptForSingleSelection()
}
