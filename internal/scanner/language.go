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
	FrameworkNetHttp Framework = "nethttp"
	FrameworkUnknown Framework = "unknown"
	FrameworkSpring Framework = "spring"
)

type Language struct {
	Framework Framework `json:"framework"`
}

func (l *Language) DetectAndSetFramework(dir string) error {
	if err := l.detectGolangFramework(dir); err != nil {
		return err
	}

	if l.Framework == FrameworkUnknown {
		if err := l.detectJavaFramework(dir); err != nil {
			return err
		}
	}

	return nil
}

func (l *Language) detectJavaFramework(dir string) error {
	javaFrameworkMaps := []string {
		"spring-boot-starter-web",
		"spring-boot-starter-webflux",
	}

	mavenPath := filepath.Join(dir, "pom.xml")
	gradlePath := filepath.Join(dir, "build.gradle")

	var targetPath string

	if _, err := os.Stat(mavenPath); err == nil {
		targetPath = mavenPath
	} else if _, err := os.Stat(gradlePath); err == nil {
		targetPath = gradlePath
	} else {
		l.Framework = FrameworkUnknown
		return nil
	}
	

	file, err := os.Open(targetPath)
	if err != nil {
		l.Framework = FrameworkUnknown
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		for _, indicator := range javaFrameworkMaps {
			if strings.Contains(line, indicator) {
				l.Framework = FrameworkSpring
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

func (l *Language) detectGolangFramework(dir string) error {
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

	l.Framework = FrameworkNetHttp

	return nil
}