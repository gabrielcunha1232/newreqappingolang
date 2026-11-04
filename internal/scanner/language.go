package scanner

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Framework string

const (
	FrameworkGin     Framework = "gin"
	FrameworkFiber   Framework = "fiber"
	FrameworkEcho    Framework = "echo"
	FrameworkChi     Framework = "chi"
	FrameworkUnknown Framework = "unknown"
)

type Language struct {
	Framework Framework `json:"framework"`
}

func (l *Language) DetectAndSetFramework(dir string) error {
	goModPath := filepath.Join(dir, "go.mod")
	if _, err := os.Stat(goModPath); os.IsNotExist(err) {
		l.Framework = FrameworkUnknown

		return nil
	}

	file, err := os.Open(goModPath)
	if err != nil {
		l.Framework = FrameworkUnknown
		return err
	}

	defer file.Close()

	frameworksmap := map[string]Framework{
		"github.com/gin-gonic/gin": FrameworkGin,
		"github.com/gofiber/fiber/v2": FrameworkFiber,
		"github.com/labstack/echo/v4": FrameworkEcho,
		"github.com/go-chi/chi/v5": FrameworkChi,
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		for importPath, framework := range frameworksmap {
			if strings.Contains(line, importPath) {
				l.Framework = framework
				return nil
			}
		}
	}

	if err := scanner.Err(); err != nil {
		l.Framework = FrameworkUnknown
		return err
	}

	l.Framework = FrameworkUnknown
	return nil
}