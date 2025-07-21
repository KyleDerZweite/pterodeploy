# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Standards

**Tone**: Minimalistic, simple-first, professional
- Use the fewest words necessary to convey information clearly
- Prefer simple language over complex technical jargon
- Focus on what users can do, not just what the system does

## Project Overview

PteroDeploy is a Python-based modpack processing system that analyzes Minecraft modpacks and generates Pterodactyl egg configurations for automated server deployment.

**Core Architecture**: Download → Extract → Analyze → Generate egg configuration

## Directory Structure

```
pterodeploy/
├── src/                        # Python processing modules
│   ├── pterodeploy_core.py    # Main processing engine
│   ├── test_suite.py          # Testing framework
│   └── archive/               # Legacy scripts
├── assets/                    # Templates and test data
│   ├── egg_template.json     # Universal egg template
│   ├── egg_galery/          # Reference configurations
│   └── packs/               # Test modpacks
├── docs/                     # Documentation
└── test_output/             # Generated test files
```

## Python Modules

### `src/pterodeploy_core.py`
Main processing engine with complete modpack pipeline:
- **ModpackProcessor**: Download, extraction, analysis
- **EggGenerator**: Creates Pterodactyl egg configurations
- **ConfigurationManager**: Settings and path management

### `src/test_suite.py`
Testing framework for validation against known working configurations:
- **TestRunner**: Executes validation tests
- **ConfigComparator**: Compares generated vs reference eggs
- **ModpackTestCase**: Structured test framework

## Egg Template System

### Universal Template (`assets/egg_template.json`)
Supports all major modloaders with auto-detection:
- **Forge** (Legacy 1.7-1.16, Modern 1.17+)
- **NeoForge** (1.20.5+)
- **Fabric** (1.14+)
- **Quilt** (1.18+)

### Auto-Detection Features
- Minecraft version → Java version mapping
- Modloader type and version detection
- Startup method selection (legacy/modern/fabric)
- Configuration file handling

### Java Version Selection
| Minecraft Version | Java Version | Docker Image |
|-------------------|--------------|--------------|
| 1.7.10 - 1.16.5   | Java 8  | `java_8`  |
| 1.17 - 1.17.1     | Java 16 | `java_16` |
| 1.18 - 1.20.4     | Java 17 | `java_17` |
| 1.20.5+           | Java 21 | `java_21` |

## Pterodactyl Integration

### Reserved Environment Variables
**Avoid these names**: `SERVER_MEMORY`, `SERVER_IP`, `SERVER_PORT`, `ENV`, `HOME`, `USER`, `STARTUP`, `SERVER_UUID`, `UUID`

**Use instead**: `MEMORY`, `STARTUP_MEMORY`, `MODPACK_URL`, `JVM_ARGS`

### Required Egg Structure
```json
{
  "meta": {"version": "PTDL_v2", "update_url": null},
  "features": ["eula", "java_version", "pid_limit"],
  "docker_images": {"Java X": "ghcr.io/pterodactyl/yolks:java_X"}
}
```

## Testing

### Validation Tests
- **MC Eternal 2**: Forge 1.20.1 server pack (modern startup)
- **Project Overpowered**: Forge 1.12.2 modpack (legacy startup)

### Usage
```python
from src.pterodeploy_core import process_modpack_from_url
from src.test_suite import run_validation_tests

# Process modpack
egg_path, info = process_modpack_from_url("https://example.com/pack.zip")

# Run tests
success = run_validation_tests()
```

## Code Standards

- Use type hints throughout
- Structured logging (not print statements)
- Custom exceptions for error handling
- Resource cleanup with context managers
- Configuration via dataclasses