"""
PteroDeploy Core Module - Professional modpack processing and egg generation system.

This module consolidates all modpack processing functionality into a clean, 
minimalistic, and professional implementation with comprehensive error handling,
logging, and type safety.
"""
import json
import logging
import os
import re
import shutil
import tempfile
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
from urllib.parse import urlparse
import requests


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PteroDeployError(Exception):
    """Base exception for PteroDeploy operations."""
    pass


class ModpackDownloadError(PteroDeployError):
    """Raised when modpack download fails."""
    pass


class ModpackExtractionError(PteroDeployError):
    """Raised when modpack extraction fails."""
    pass


class ModpackAnalysisError(PteroDeployError):
    """Raised when modpack analysis fails."""
    pass


class EggGenerationError(PteroDeployError):
    """Raised when egg generation fails."""
    pass


@dataclass
class ModloaderInfo:
    """Information about detected modloader."""
    loader_type: str  # forge, neoforge, fabric, quilt
    version: str
    minecraft_version: str
    startup_method: str  # legacy, modern, fabric
    java_version: int = 21


@dataclass
class ModpackInfo:
    """Complete information about analyzed modpack."""
    name: str
    path: str
    modloader: ModloaderInfo
    is_server_pack: bool
    override_dir: str = "overrides"
    config_files: List[str] = field(default_factory=list)
    startup_scripts: List[str] = field(default_factory=list)


@dataclass
class ProcessingConfig:
    """Configuration for modpack processing."""
    download_dir: Path = Path("assets/packs")
    temp_dir: Path = Path("assets/packs/temp")
    output_dir: Path = Path("generated_eggs")
    template_path: Path = Path("assets/egg_template.json")
    timeout_seconds: int = 300


class ConfigurationManager:
    """Manages configuration and paths for PteroDeploy operations."""
    
    def __init__(self, config: Optional[ProcessingConfig] = None):
        self.config = config or ProcessingConfig()
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Ensure all required directories exist."""
        for directory in [self.config.download_dir, self.config.temp_dir, self.config.output_dir]:
            directory.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Ensured directory exists: {directory}")


class ModpackProcessor:
    """Handles downloading, extraction, and analysis of modpacks."""
    
    def __init__(self, config_manager: ConfigurationManager):
        self.config = config_manager.config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'PteroDeploy/1.0 (Modpack Processor)'
        })
    
    def download_modpack(self, url: str, filename: Optional[str] = None) -> Path:
        """Download modpack from URL with progress tracking."""
        if not filename:
            parsed_url = urlparse(url)
            filename = Path(parsed_url.path).name
            if not filename:
                raise ModpackDownloadError("Could not determine filename from URL")
        
        file_path = self.config.download_dir / filename
        
        logger.info(f"Downloading modpack from {url}")
        logger.debug(f"Saving to {file_path}")
        
        try:
            with self.session.get(url, stream=True, timeout=self.config.timeout_seconds) as response:
                response.raise_for_status()
                
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            
                            if total_size > 0:
                                progress = (downloaded / total_size) * 100
                                if downloaded % (1024 * 1024) == 0:  # Log every MB
                                    logger.debug(f"Download progress: {progress:.1f}%")
                
                logger.info(f"Download completed: {file_path} ({downloaded} bytes)")
                return file_path
                
        except requests.exceptions.RequestException as e:
            raise ModpackDownloadError(f"Failed to download modpack: {e}")
        except OSError as e:
            raise ModpackDownloadError(f"Failed to save modpack: {e}")
    
    def extract_modpack(self, zip_path: Path) -> Path:
        """Extract modpack to temporary directory."""
        if not zip_path.exists():
            raise ModpackExtractionError(f"Zip file not found: {zip_path}")
        
        temp_dir = self.config.temp_dir / f"extract_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Extracting {zip_path} to {temp_dir}")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
                
            extracted_files = list(temp_dir.rglob("*"))
            logger.info(f"Extracted {len(extracted_files)} files")
            return temp_dir
            
        except zipfile.BadZipFile as e:
            raise ModpackExtractionError(f"Invalid zip file: {e}")
        except OSError as e:
            raise ModpackExtractionError(f"Extraction failed: {e}")
    
    def analyze_modpack(self, extracted_path: Path) -> ModpackInfo:
        """Analyze extracted modpack to determine configuration."""
        logger.info(f"Analyzing modpack at {extracted_path}")
        
        manifest_path = extracted_path / "manifest.json"
        modloader_info = None
        is_server_pack = False
        
        # Try to parse manifest.json first (client modpacks)
        if manifest_path.exists():
            modloader_info, override_dir = self._parse_manifest(manifest_path)
            logger.debug(f"Found manifest.json with modloader: {modloader_info.loader_type}")
        else:
            # Check for server pack structure
            modloader_info, is_server_pack = self._detect_server_pack(extracted_path)
            override_dir = "overrides"  # Default for server packs
            
        if not modloader_info:
            raise ModpackAnalysisError("Could not detect modloader information")
        
        # Find configuration files and startup scripts
        config_files = self._find_config_files(extracted_path, override_dir)
        startup_scripts = self._find_startup_scripts(extracted_path)
        
        modpack_name = extracted_path.name
        
        modpack_info = ModpackInfo(
            name=modpack_name,
            path=str(extracted_path),
            modloader=modloader_info,
            is_server_pack=is_server_pack,
            override_dir=override_dir,
            config_files=config_files,
            startup_scripts=startup_scripts
        )
        
        logger.info(f"Analysis complete: {modloader_info.loader_type} {modloader_info.version} "
                   f"for Minecraft {modloader_info.minecraft_version}")
        return modpack_info
    
    def _parse_manifest(self, manifest_path: Path) -> Tuple[ModloaderInfo, str]:
        """Parse manifest.json to extract modloader information."""
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            # Extract Minecraft version
            minecraft_version = manifest.get('minecraft', {}).get('version', '')
            if not minecraft_version:
                raise ModpackAnalysisError("No Minecraft version in manifest")
            
            # Extract modloader information
            modloaders = manifest.get('minecraft', {}).get('modLoaders', [])
            if not modloaders:
                raise ModpackAnalysisError("No modloaders in manifest")
            
            modloader_id = modloaders[0].get('id', '')
            loader_type, version = self._parse_modloader_id(modloader_id)
            
            # Determine Java version
            java_version = self._get_java_version(minecraft_version)
            
            # Determine startup method
            startup_method = self._get_startup_method(loader_type, minecraft_version)
            
            modloader_info = ModloaderInfo(
                loader_type=loader_type,
                version=version,
                minecraft_version=minecraft_version,
                startup_method=startup_method,
                java_version=java_version
            )
            
            override_dir = manifest.get('overrides', 'overrides')
            return modloader_info, override_dir
            
        except (json.JSONDecodeError, OSError) as e:
            raise ModpackAnalysisError(f"Failed to parse manifest.json: {e}")
    
    def _detect_server_pack(self, extracted_path: Path) -> Tuple[Optional[ModloaderInfo], bool]:
        """Detect server pack by looking for installer JARs."""
        jar_files = list(extracted_path.glob("*.jar"))
        
        for jar_file in jar_files:
            jar_name = jar_file.name.lower()
            
            # Check for Forge installer
            forge_match = re.match(r'forge-(\d+\.\d+\.\d+)-(\d+\.\d+\.\d+)-installer\.jar', jar_name)
            if forge_match:
                minecraft_version = forge_match.group(1)
                forge_version = forge_match.group(2)
                java_version = self._get_java_version(minecraft_version)
                startup_method = self._get_startup_method("forge", minecraft_version)
                
                return ModloaderInfo(
                    loader_type="forge",
                    version=forge_version,
                    minecraft_version=minecraft_version,
                    startup_method=startup_method,
                    java_version=java_version
                ), True
            
            # Check for NeoForge installer
            neoforge_match = re.match(r'neoforge-(\d+\.\d+\.\d+)-installer\.jar', jar_name)
            if neoforge_match:
                neoforge_version = neoforge_match.group(1)
                # NeoForge is typically for 1.20.5+
                minecraft_version = "1.21.1"  # Default assumption
                java_version = self._get_java_version(minecraft_version)
                
                return ModloaderInfo(
                    loader_type="neoforge",
                    version=neoforge_version,
                    minecraft_version=minecraft_version,
                    startup_method="modern",
                    java_version=java_version
                ), True
        
        return None, False
    
    def _parse_modloader_id(self, modloader_id: str) -> Tuple[str, str]:
        """Parse modloader ID to extract type and version."""
        if modloader_id.startswith("forge-"):
            return "forge", modloader_id[6:]
        elif modloader_id.startswith("neoforge-"):
            return "neoforge", modloader_id[9:]
        elif modloader_id.startswith("fabric-"):
            return "fabric", modloader_id[7:]
        elif modloader_id.startswith("quilt-"):
            return "quilt", modloader_id[6:]
        else:
            raise ModpackAnalysisError(f"Unknown modloader ID: {modloader_id}")
    
    def _get_java_version(self, minecraft_version: str) -> int:
        """Determine required Java version based on Minecraft version."""
        version_parts = minecraft_version.split('.')
        if len(version_parts) < 2:
            return 21  # Default to latest
        
        major = int(version_parts[1])
        minor = int(version_parts[2]) if len(version_parts) > 2 else 0
        
        if major <= 16:
            return 8
        elif major == 17 and minor <= 1:
            return 16
        elif major <= 20 or (major == 21 and minor == 0):
            return 17
        else:
            return 21
    
    def _get_startup_method(self, loader_type: str, minecraft_version: str) -> str:
        """Determine startup method based on loader type and MC version."""
        if loader_type in ["fabric", "quilt"]:
            return "fabric"
        elif loader_type in ["forge", "neoforge"]:
            version_parts = minecraft_version.split('.')
            if len(version_parts) >= 2 and int(version_parts[1]) >= 17:
                return "modern"
            else:
                return "legacy"
        return "modern"
    
    def _find_config_files(self, extracted_path: Path, override_dir: str) -> List[str]:
        """Find configuration files in the modpack."""
        config_files = []
        
        # Check override directory
        override_path = extracted_path / override_dir
        if override_path.exists():
            config_dirs = ["config", "defaultconfigs", "scripts"]
            for config_dir in config_dirs:
                config_path = override_path / config_dir
                if config_path.exists():
                    config_files.extend([str(f.relative_to(extracted_path)) 
                                       for f in config_path.rglob("*") if f.is_file()])
        
        return config_files
    
    def _find_startup_scripts(self, extracted_path: Path) -> List[str]:
        """Find startup scripts in the modpack."""
        script_names = ["start.sh", "start.bat", "startserver.sh", "startserver.bat", "run.sh", "run.bat"]
        startup_scripts = []
        
        for script_name in script_names:
            script_path = extracted_path / script_name
            if script_path.exists():
                startup_scripts.append(str(script_path.relative_to(extracted_path)))
        
        return startup_scripts
    
    def cleanup_temp_dir(self, temp_dir: Path) -> None:
        """Clean up temporary extraction directory."""
        if temp_dir.exists():
            logger.debug(f"Cleaning up temporary directory: {temp_dir}")
            shutil.rmtree(temp_dir)


class EggGenerator:
    """Generates Pterodactyl egg configurations from modpack analysis."""
    
    def __init__(self, config_manager: ConfigurationManager):
        self.config = config_manager.config
        self.template = self._load_template()
    
    def _load_template(self) -> Dict[str, Any]:
        """Load the universal egg template."""
        if not self.config.template_path.exists():
            raise EggGenerationError(f"Template not found: {self.config.template_path}")
        
        try:
            with open(self.config.template_path, 'r', encoding='utf-8') as f:
                template = json.load(f)
            logger.debug(f"Loaded template from {self.config.template_path}")
            return template
        except (json.JSONDecodeError, OSError) as e:
            raise EggGenerationError(f"Failed to load template: {e}")
    
    def generate_egg(self, modpack_info: ModpackInfo, modpack_url: str) -> Dict[str, Any]:
        """Generate complete egg configuration from modpack analysis."""
        logger.info(f"Generating egg for {modpack_info.name}")
        
        # Create egg configuration by replacing template variables
        egg_config = json.loads(json.dumps(self.template))  # Deep copy
        
        # Basic information
        replacements = {
            "{{{EXPORT_DATE}}}": datetime.now().isoformat(),
            "{{{MODPACK_NAME}}}": f"{modpack_info.name} ({modpack_info.modloader.minecraft_version})",
            "{{{AUTHOR_EMAIL}}}": "pterodeploy@generated.com",
            "{{{MODPACK_DESCRIPTION}}}": f"{modpack_info.name} modpack - {modpack_info.modloader.loader_type.title()} {modpack_info.modloader.version}",
            "{{{MODPACK_DISPLAY_NAME}}}": modpack_info.name,
            "{{{MODPACK_URL}}}": modpack_url,
            "{{{DEFAULT_MAX_MEMORY}}}": self._get_recommended_memory(modpack_info)[1],
            "{{{DEFAULT_MIN_MEMORY}}}": self._get_recommended_memory(modpack_info)[0],
            "{{{DEFAULT_JVM_ARGS}}}": self._get_jvm_args(modpack_info),
            "{{{DEFAULT_LAUNCHER_TARGET}}}": self._get_launcher_target(modpack_info),
            "{{{DEFAULT_MODLOADER_TYPE}}}": modpack_info.modloader.loader_type,
            "{{{DEFAULT_MODLOADER_VERSION}}}": modpack_info.modloader.version,
            "{{{JAVA_VERSION_NAME}}}": f"Java {modpack_info.modloader.java_version}",
            "{{{DOCKER_IMAGE}}}": f"ghcr.io/pterodactyl/yolks:java_{modpack_info.modloader.java_version}"
        }
        
        # Replace all template variables
        egg_json = json.dumps(egg_config)
        for placeholder, value in replacements.items():
            egg_json = egg_json.replace(placeholder, str(value))
        
        egg_config = json.loads(egg_json)
        
        logger.info(f"Generated egg configuration for {modpack_info.name}")
        return egg_config
    
    def save_egg(self, egg_config: Dict[str, Any], filename: str) -> Path:
        """Save egg configuration to file."""
        output_path = self.config.output_dir / filename
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(egg_config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved egg configuration to {output_path}")
            return output_path
        except OSError as e:
            raise EggGenerationError(f"Failed to save egg: {e}")
    
    def _get_recommended_memory(self, modpack_info: ModpackInfo) -> Tuple[str, str]:
        """Get recommended memory settings based on modpack analysis."""
        # Base memory recommendations on modloader and pack complexity
        if modpack_info.modloader.loader_type in ["forge", "neoforge"]:
            min_memory = "4096"
            max_memory = "8192"
        else:  # fabric, quilt
            min_memory = "2048"
            max_memory = "6144"
        
        # Adjust for Minecraft version (newer versions need more memory)
        if modpack_info.modloader.minecraft_version.startswith("1.20") or modpack_info.modloader.minecraft_version.startswith("1.21"):
            min_memory = str(int(min_memory) + 1024)
            max_memory = str(int(max_memory) + 2048)
        
        return min_memory, max_memory
    
    def _get_jvm_args(self, modpack_info: ModpackInfo) -> str:
        """Generate appropriate JVM arguments."""
        if modpack_info.modloader.java_version >= 17:
            return "-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -Dfml.queryResult=confirm"
        else:
            return "-XX:+UseG1GC -Dfml.queryResult=confirm"
    
    def _get_launcher_target(self, modpack_info: ModpackInfo) -> str:
        """Generate launcher target based on startup method."""
        if modpack_info.modloader.startup_method == "legacy":
            return f"-jar forge-{modpack_info.modloader.minecraft_version}-{modpack_info.modloader.version}-universal.jar nogui"
        elif modpack_info.modloader.startup_method == "modern":
            if modpack_info.modloader.loader_type == "forge":
                return f"@user_jvm_args.txt @libraries/net/minecraftforge/forge/{modpack_info.modloader.minecraft_version}-{modpack_info.modloader.version}/unix_args.txt --nogui"
            else:  # neoforge
                return f"@user_jvm_args.txt @libraries/net/neoforged/neoforge/{modpack_info.modloader.version}/unix_args.txt --nogui"
        else:  # fabric
            return f"-jar {modpack_info.modloader.loader_type}-server-launch.jar nogui"


def process_modpack_from_url(url: str, config: Optional[ProcessingConfig] = None) -> Tuple[Path, Dict[str, Any]]:
    """
    Complete pipeline: download, analyze, and generate egg from modpack URL.
    
    Returns:
        Tuple of (egg_file_path, modpack_info_dict)
    """
    config_manager = ConfigurationManager(config)
    processor = ModpackProcessor(config_manager)
    generator = EggGenerator(config_manager)
    
    temp_dir = None
    try:
        # Download modpack
        zip_path = processor.download_modpack(url)
        
        # Extract modpack
        temp_dir = processor.extract_modpack(zip_path)
        
        # Analyze modpack
        modpack_info = processor.analyze_modpack(temp_dir)
        
        # Generate egg
        egg_config = generator.generate_egg(modpack_info, url)
        
        # Save egg
        egg_filename = f"{modpack_info.name.replace(' ', '_').lower()}_egg.json"
        egg_path = generator.save_egg(egg_config, egg_filename)
        
        logger.info(f"Successfully processed modpack: {modpack_info.name}")
        
        return egg_path, {
            "modpack_info": modpack_info,
            "egg_config": egg_config,
            "processing_success": True
        }
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise
    finally:
        # Cleanup
        if temp_dir:
            processor.cleanup_temp_dir(temp_dir)