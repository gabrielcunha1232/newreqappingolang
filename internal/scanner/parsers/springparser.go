package parsers

import (
	"bufio"
	"changeme/internal/models"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var _ Parser = (*SpringParser)(nil)

var springBaseRouteRegex = regexp.MustCompile(`@RequestMapping\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]+)"\s*\)`)
var springMethodRouteRegex = regexp.MustCompile(`@(Get|Post|Put|Delete|Patch|Request)Mapping(?:\s*\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"\s*\))?`)

type SpringParser struct {
}

func NewSpringParser() *SpringParser {
	return &SpringParser{}
}

func (s *SpringParser) Execute(source string) ([]models.Endpoint, error) {
	info, err := os.Stat(source)
	if err != nil {
		return nil, err
	}

	if !info.IsDir() {
		return s.extractEndpointsFromFile(source)
	}

	return s.scanDir(source)
}

func (s *SpringParser) extractEndpointsFromFile (source string) ([]models.Endpoint, error) {
	baseRoute, err := s.extractBaseRoute(source)
	if err != nil {
		return nil, err
	}

	file, err := os.Open(source)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var endpoints []models.Endpoint
	var isController bool = false
	
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()

		if strings.Contains(line, "@RestController") || strings.Contains(line, "@Controller"){
			isController = true
		}

		if strings.Contains(line, "public class") {
			break
		}
	}

	if !isController {
		return nil, nil
	}

	baseRoute = strings.TrimSuffix(baseRoute, "/")

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		methodMatches := springMethodRouteRegex.FindStringSubmatch(line)
		if len(methodMatches) > 1 {
			verbType := methodMatches[1]
			methodRoute := ""

			if len(methodMatches) > 2 {
				methodRoute = methodMatches[2]
			}

			var httpMethod string
			switch verbType {
			case "Get":
				httpMethod = "GET"
			case "Post":
				httpMethod = "POST"
			case "Put":
				httpMethod = "PUT"
				case "Delete":
				httpMethod = "DELETE"
			case "Patch":
				httpMethod = "PATCH"
			default:
				httpMethod = "GET"
			}

			if methodRoute != "" && !strings.HasPrefix(methodRoute, "/") {
				methodRoute = "/" + methodRoute
			}

			fullpath := baseRoute + methodRoute
			if fullpath == "" {
				fullpath = "/"
			}

			endpoints = append(endpoints, models.Endpoint{
				Method: httpMethod,
				Path: fullpath,
			})
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return endpoints, nil
}

func (s *SpringParser) extractBaseRoute(filepath string) (string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()

		if strings.Contains(line, "public class") || strings.Contains(line, "interface") {
			break
		}

		matches := springBaseRouteRegex.FindStringSubmatch(line)
		if len(matches) > 1 {
			baseroute := matches[1]

			if !strings.HasPrefix(baseroute, "/") {
				baseroute = "/" + baseroute
			}

			return baseroute, nil
		}
	}

	if err := scanner.Err(); err != nil {
		return "", err
	}

	return "/", err
}

func (s *SpringParser) scanDir(dir string) ([]models.Endpoint, error) {
	var endpoints []models.Endpoint

	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			name := d.Name()
			if name == "target" || name == "build" || name == "src/test" || name == ".git" {
				return filepath.SkipDir
			}

			return nil
		}


		if filepath.Ext(path) == ".java" {
			fileEndpoints, err := s.extractEndpointsFromFile(path)
			if err != nil {
				return err
			}

			endpoints = append(endpoints, fileEndpoints...)
		}

		return nil
	})

	return endpoints, err
}
