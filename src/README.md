# PteroDeploy Python Modules

Professional modpack processing system for Pterodactyl egg generation.

## Core Modules

### `pterodeploy_core.py`
Main processing engine providing modpack download, extraction, analysis, and Pterodactyl egg configuration generation.

**Key Classes:**
- `ModpackProcessor` - Handles modpack download, extraction, and analysis
- `EggGenerator` - Creates Pterodactyl egg configurations from analysis
- `ConfigurationManager` - Manages paths and processing configuration

### `test_suite.py`
Comprehensive testing framework for validating generated configurations against known working eggs.

**Features:**
- Automated validation against MC Eternal 2 and Project Overpowered
- Configuration comparison utilities
- Test reporting and analysis

## Usage

### Basic Processing
```python
from pterodeploy_core import process_modpack_from_url

# Process modpack from URL
egg_path, processing_info = process_modpack_from_url("https://example.com/modpack.zip")
```

### Advanced Usage
```python
from pterodeploy_core import ConfigurationManager, ModpackProcessor, EggGenerator, ProcessingConfig

# Custom configuration
config = ProcessingConfig(
    download_dir=Path("custom/downloads"),
    output_dir=Path("custom/output")
)

config_manager = ConfigurationManager(config)
processor = ModpackProcessor(config_manager)
generator = EggGenerator(config_manager)

# Process with custom pipeline
zip_path = processor.download_modpack(url)
temp_dir = processor.extract_modpack(zip_path)
modpack_info = processor.analyze_modpack(temp_dir)
egg_config = generator.generate_egg(modpack_info, url)
```

### Testing
```python
from test_suite import run_validation_tests

# Run all validation tests
success = run_validation_tests()
```

## Supported Formats

- **Modloaders:** Forge, NeoForge, Fabric, Quilt
- **Pack Types:** Client modpacks (manifest.json), Server packs
- **Java Versions:** Auto-detection based on Minecraft version
- **Minecraft Versions:** 1.7.10 - 1.21+

## Requirements

- Python 3.8+
- `requests` for HTTP operations
- Standard library modules for file processing