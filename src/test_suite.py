"""
PteroDeploy Test Suite - Comprehensive testing framework with known working config validation.

This module provides testing utilities for validating modpack processing against
proven working Pterodactyl egg configurations.
"""
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime
import difflib

from pterodeploy_core import (
    ConfigurationManager, ModpackProcessor, EggGenerator, 
    ProcessingConfig, process_modpack_from_url, PteroDeployError
)


logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    """Result of a test case execution."""
    test_name: str
    success: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    execution_time: float = 0.0


@dataclass
class ComparisonResult:
    """Result of comparing generated egg with reference configuration."""
    matches: bool
    differences: List[str] = field(default_factory=list)
    score: float = 0.0  # Similarity score (0-1)
    critical_mismatches: List[str] = field(default_factory=list)
    non_critical_differences: List[str] = field(default_factory=list)


@dataclass
class KnownModpack:
    """Configuration for a known working modpack."""
    name: str
    zip_file: str  # Filename in assets/packs/
    reference_egg: str  # Filename in assets/egg_galery/
    modpack_type: str  # "serverpack" or "modpack"
    modloader: str  # "forge", "neoforge", "fabric", "quilt"
    minecraft_version: str
    expected_java_version: int
    description: str = ""


class ConfigComparator:
    """Utilities for comparing generated eggs with reference configurations."""
    
    # Fields that are allowed to differ between generated and reference configs
    IGNORE_FIELDS = {
        "exported_at", "_comment", "meta.update_url", "author"
    }
    
    # Fields that are critical for functionality
    CRITICAL_FIELDS = {
        "startup", "docker_images", "scripts.installation.script", 
        "variables[name='Memory'].default_value", "variables[name='Startup Memory'].default_value"
    }
    
    def compare_eggs(self, generated: Dict[str, Any], reference: Dict[str, Any]) -> ComparisonResult:
        """Compare generated egg configuration with reference."""
        differences = []
        critical_mismatches = []
        non_critical_differences = []
        
        # Normalize both configs for comparison
        gen_normalized = self._normalize_config(generated)
        ref_normalized = self._normalize_config(reference)
        
        # Compare critical fields first
        critical_diffs = self._compare_critical_fields(gen_normalized, ref_normalized)
        critical_mismatches.extend(critical_diffs)
        
        # Compare all fields recursively
        all_diffs = self._compare_recursive(gen_normalized, ref_normalized, "")
        
        for diff in all_diffs:
            if any(critical in diff for critical in self.CRITICAL_FIELDS):
                critical_mismatches.append(diff)
            else:
                non_critical_differences.append(diff)
        
        differences = critical_mismatches + non_critical_differences
        
        # Calculate similarity score
        total_fields = self._count_fields(ref_normalized)
        mismatched_fields = len(differences)
        score = max(0.0, (total_fields - mismatched_fields) / total_fields) if total_fields > 0 else 0.0
        
        # Consider it a match if no critical mismatches and score > 0.8
        matches = len(critical_mismatches) == 0 and score > 0.8
        
        return ComparisonResult(
            matches=matches,
            differences=differences,
            score=score,
            critical_mismatches=critical_mismatches,
            non_critical_differences=non_critical_differences
        )
    
    def _normalize_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize configuration for comparison by removing/standardizing variable fields."""
        normalized = json.loads(json.dumps(config))  # Deep copy
        
        # Remove or normalize fields that are expected to differ
        if "exported_at" in normalized:
            normalized["exported_at"] = "NORMALIZED"
        if "_comment" in normalized:
            del normalized["_comment"]
        if "meta" in normalized and "update_url" in normalized["meta"]:
            normalized["meta"]["update_url"] = None
        
        # Normalize author field
        if "author" in normalized:
            normalized["author"] = "NORMALIZED"
            
        # Normalize URLs in variables to be relative
        if "variables" in normalized:
            for var in normalized["variables"]:
                if var.get("env_variable") == "SERVER_PACK_URL" and "default_value" in var:
                    if var["default_value"].startswith("http"):
                        var["default_value"] = "NORMALIZED_URL"
        
        return normalized
    
    def _compare_critical_fields(self, generated: Dict[str, Any], reference: Dict[str, Any]) -> List[str]:
        """Compare critical fields that must match for functionality."""
        critical_diffs = []
        
        # Check startup command compatibility
        gen_startup = generated.get("startup", "")
        ref_startup = reference.get("startup", "")
        
        if not self._startup_commands_compatible(gen_startup, ref_startup):
            critical_diffs.append(f"Startup command mismatch: '{gen_startup}' vs '{ref_startup}'")
        
        # Check Docker image compatibility
        gen_images = generated.get("docker_images", {})
        ref_images = reference.get("docker_images", {})
        
        if not self._docker_images_compatible(gen_images, ref_images):
            critical_diffs.append(f"Docker image mismatch: {gen_images} vs {ref_images}")
        
        return critical_diffs
    
    def _startup_commands_compatible(self, generated: str, reference: str) -> bool:
        """Check if startup commands are functionally compatible."""
        # Extract key components from startup commands
        gen_parts = set(generated.split())
        ref_parts = set(reference.split())
        
        # Key elements that should be present
        memory_pattern = {"-Xms{{STARTUP_MEMORY}}M", "-Xmx{{MEMORY}}M"}
        
        # Check if both have memory settings
        gen_has_memory = any("Xms" in part or "Xmx" in part for part in gen_parts)
        ref_has_memory = any("Xms" in part or "Xmx" in part for part in ref_parts)
        
        if gen_has_memory != ref_has_memory:
            return False
        
        # Check for nogui flag
        gen_has_nogui = any("nogui" in part for part in gen_parts)
        ref_has_nogui = any("nogui" in part for part in ref_parts)
        
        if gen_has_nogui != ref_has_nogui:
            return False
        
        return True
    
    def _docker_images_compatible(self, generated: Dict, reference: Dict) -> bool:
        """Check if Docker images are compatible (same Java version)."""
        if not generated or not reference:
            return generated == reference
        
        # Extract Java versions from image names
        gen_java = self._extract_java_version(list(generated.values())[0] if generated else "")
        ref_java = self._extract_java_version(list(reference.values())[0] if reference else "")
        
        return gen_java == ref_java
    
    def _extract_java_version(self, image_name: str) -> str:
        """Extract Java version from Docker image name."""
        if "java_8" in image_name:
            return "8"
        elif "java_16" in image_name:
            return "16"
        elif "java_17" in image_name:
            return "17"
        elif "java_21" in image_name:
            return "21"
        return "unknown"
    
    def _compare_recursive(self, obj1: Any, obj2: Any, path: str) -> List[str]:
        """Recursively compare two objects and return list of differences."""
        differences = []
        
        if isinstance(obj1, dict) and isinstance(obj2, dict):
            all_keys = set(obj1.keys()) | set(obj2.keys())
            for key in all_keys:
                current_path = f"{path}.{key}" if path else key
                
                # Skip ignored fields
                if current_path in self.IGNORE_FIELDS:
                    continue
                
                if key not in obj1:
                    differences.append(f"Missing key in generated: {current_path}")
                elif key not in obj2:
                    differences.append(f"Extra key in generated: {current_path}")
                else:
                    differences.extend(self._compare_recursive(obj1[key], obj2[key], current_path))
        
        elif isinstance(obj1, list) and isinstance(obj2, list):
            if len(obj1) != len(obj2):
                differences.append(f"Array length mismatch at {path}: {len(obj1)} vs {len(obj2)}")
            else:
                for i, (item1, item2) in enumerate(zip(obj1, obj2)):
                    differences.extend(self._compare_recursive(item1, item2, f"{path}[{i}]"))
        
        elif obj1 != obj2:
            differences.append(f"Value mismatch at {path}: '{obj1}' vs '{obj2}'")
        
        return differences
    
    def _count_fields(self, obj: Any, path: str = "") -> int:
        """Count total number of fields in nested object."""
        if isinstance(obj, dict):
            count = 0
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                if current_path not in self.IGNORE_FIELDS:
                    count += 1 + self._count_fields(value, current_path)
            return count
        elif isinstance(obj, list):
            return sum(self._count_fields(item, f"{path}[{i}]") for i, item in enumerate(obj))
        else:
            return 1


class ModpackTestCase:
    """Framework for structured modpack testing."""
    
    def __init__(self, known_modpack: KnownModpack, base_path: Path = Path.cwd()):
        self.modpack = known_modpack
        self.base_path = base_path
        self.comparator = ConfigComparator()
    
    def run_test(self) -> TestResult:
        """Execute the complete test case."""
        start_time = datetime.now()
        result = TestResult(test_name=self.modpack.name, success=False, message="")
        
        try:
            # Load reference egg
            reference_egg = self._load_reference_egg()
            if not reference_egg:
                result.message = "Failed to load reference egg"
                result.errors.append(f"Reference egg not found: {self.modpack.reference_egg}")
                return result
            
            # Test with existing zip file if available
            zip_path = self.base_path / "assets" / "packs" / self.modpack.zip_file
            if not zip_path.exists():
                result.message = f"Test modpack not found: {zip_path}"
                result.errors.append(f"Zip file not found: {self.modpack.zip_file}")
                return result
            
            # Process modpack using local file
            generated_egg, processing_info = self._process_local_modpack(zip_path)
            
            # Compare with reference
            comparison = self.comparator.compare_eggs(generated_egg, reference_egg)
            
            # Evaluate results
            result.success = comparison.matches
            result.details = {
                "comparison": comparison,
                "processing_info": processing_info,
                "reference_egg": reference_egg,
                "generated_egg": generated_egg
            }
            
            if result.success:
                result.message = f"Test passed - Similarity score: {comparison.score:.2f}"
            else:
                result.message = f"Test failed - Critical mismatches: {len(comparison.critical_mismatches)}"
                result.errors.extend(comparison.critical_mismatches)
                result.warnings.extend(comparison.non_critical_differences[:5])  # Limit warnings
            
        except Exception as e:
            result.message = f"Test execution failed: {e}"
            result.errors.append(str(e))
            logger.exception(f"Test case failed for {self.modpack.name}")
        
        result.execution_time = (datetime.now() - start_time).total_seconds()
        return result
    
    def _load_reference_egg(self) -> Optional[Dict[str, Any]]:
        """Load the reference egg configuration."""
        ref_path = self.base_path / "assets" / "egg_galery" / self.modpack.reference_egg
        
        try:
            with open(ref_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load reference egg {ref_path}: {e}")
            return None
    
    def _process_local_modpack(self, zip_path: Path) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Process modpack from local zip file."""
        config = ProcessingConfig(
            download_dir=zip_path.parent,
            temp_dir=zip_path.parent / "temp",
            output_dir=self.base_path / "test_output"
        )
        
        config_manager = ConfigurationManager(config)
        processor = ModpackProcessor(config_manager)
        generator = EggGenerator(config_manager)
        
        temp_dir = None
        try:
            # Extract modpack
            temp_dir = processor.extract_modpack(zip_path)
            
            # Analyze modpack  
            modpack_info = processor.analyze_modpack(temp_dir)
            
            # Generate egg (use dummy URL for testing)
            dummy_url = f"file://{zip_path}"
            egg_config = generator.generate_egg(modpack_info, dummy_url)
            
            return egg_config, {
                "modpack_info": modpack_info,
                "analysis_success": True
            }
            
        finally:
            if temp_dir:
                processor.cleanup_temp_dir(temp_dir)


class TestRunner:
    """Main test runner for PteroDeploy validation."""
    
    def __init__(self, base_path: Path = Path.cwd()):
        self.base_path = base_path
        self.test_cases: List[ModpackTestCase] = []
        self._setup_known_modpacks()
    
    def _setup_known_modpacks(self):
        """Initialize known modpack test cases."""
        known_modpacks = [
            KnownModpack(
                name="MC Eternal 2 ServerPack Test",
                zip_file="MCE2-Server-Files-1.1.0.2.zip",
                reference_egg="mc-eternal-2-1.1.0.2-final_verified.json",
                modpack_type="serverpack",
                modloader="forge",
                minecraft_version="1.20.1",
                expected_java_version=21,
                description="Forge 1.20.1 server pack with modern startup method"
            ),
            KnownModpack(
                name="Project Overpowered Modpack Test", 
                zip_file="Project Overpowered RELEASE 4.9.zip",
                reference_egg="project-overpowered-4.9.json",
                modpack_type="modpack",
                modloader="forge",
                minecraft_version="1.12.2",
                expected_java_version=8,
                description="Forge 1.12.2 modpack with legacy universal jar startup"
            )
        ]
        
        for modpack in known_modpacks:
            self.test_cases.append(ModpackTestCase(modpack, self.base_path))
        
        logger.info(f"Initialized {len(self.test_cases)} test cases")
    
    def run_all_tests(self) -> List[TestResult]:
        """Run all configured test cases."""
        logger.info("Starting comprehensive test suite")
        results = []
        
        for test_case in self.test_cases:
            logger.info(f"Running test: {test_case.modpack.name}")
            result = test_case.run_test()
            results.append(result)
            
            if result.success:
                logger.info(f"✓ {result.test_name}: {result.message}")
            else:
                logger.warning(f"✗ {result.test_name}: {result.message}")
                for error in result.errors:
                    logger.warning(f"  Error: {error}")
        
        return results
    
    def run_single_test(self, test_name: str) -> Optional[TestResult]:
        """Run a specific test case by name."""
        for test_case in self.test_cases:
            if test_case.modpack.name == test_name:
                return test_case.run_test()
        
        logger.error(f"Test case not found: {test_name}")
        return None
    
    def generate_test_report(self, results: List[TestResult]) -> str:
        """Generate a comprehensive test report."""
        report_lines = [
            "=" * 80,
            "PteroDeploy Test Suite Report",
            "=" * 80,
            f"Generated: {datetime.now().isoformat()}",
            f"Total Tests: {len(results)}",
            f"Passed: {sum(1 for r in results if r.success)}",
            f"Failed: {sum(1 for r in results if not r.success)}",
            ""
        ]
        
        for result in results:
            status = "PASS" if result.success else "FAIL"
            report_lines.extend([
                f"{status}: {result.test_name}",
                f"  Execution Time: {result.execution_time:.2f}s",
                f"  Message: {result.message}",
            ])
            
            if result.errors:
                report_lines.append("  Errors:")
                for error in result.errors:
                    report_lines.append(f"    - {error}")
            
            if result.warnings:
                report_lines.append("  Warnings:")
                for warning in result.warnings[:3]:  # Limit warnings
                    report_lines.append(f"    - {warning}")
            
            if hasattr(result.details.get("comparison"), "score"):
                score = result.details["comparison"].score
                report_lines.append(f"  Similarity Score: {score:.2f}")
            
            report_lines.append("")
        
        return "\n".join(report_lines)


def run_validation_tests(base_path: Path = Path.cwd()) -> bool:
    """
    Main entry point for running validation tests.
    
    Returns:
        True if all tests pass, False otherwise
    """
    runner = TestRunner(base_path)
    results = runner.run_all_tests()
    
    # Generate and save report
    report = runner.generate_test_report(results)
    report_path = base_path / "test_report.txt"
    
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        logger.info(f"Test report saved to: {report_path}")
    except OSError as e:
        logger.warning(f"Failed to save test report: {e}")
    
    # Print summary
    passed = sum(1 for r in results if r.success)
    total = len(results)
    
    print(f"\nTest Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print(f"❌ {total - passed} tests failed")
        for result in results:
            if not result.success:
                print(f"  - {result.test_name}: {result.message}")
        return False


if __name__ == "__main__":
    # Run tests when script is executed directly
    success = run_validation_tests()
    exit(0 if success else 1)