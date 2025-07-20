"""
Unzipped Modpack -> Load Template -> Check what is needed and what is avaialble -> Create comparision and need-to-add list -> Comparison Config (Report)
"""
import os
import json
import re
from typing import Dict, Any, Optional, List

class ModpackAnalyser:
    """
    Analyzes an unzipped modpack directory to identify key characteristics
    and compare them against a template for Pterodactyl egg creation.
    """

    def __init__(self, unzipped_path: str, template_path: Optional[str] = None):
        """
        Initializes the ModpackAnalyser.

        Args:
            unzipped_path (str): The path to the directory containing the unzipped modpack.
            template_path (Optional[str]): Path to a JSON template file for comparison.
        """
        if not os.path.isdir(unzipped_path):
            raise FileNotFoundError(f"Unzipped modpack directory not found at: {unzipped_path}")
        self.unzipped_path = unzipped_path
        self.template = self._load_template(template_path) if template_path else {}
        self.analysis_report = {}

    def _load_template(self, template_path: str) -> Dict[str, Any]:
        """Loads a JSON template file."""
        try:
            with open(template_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Warning: Could not load or parse template file: {e}")
            return {}

    def analyse(self) -> Dict[str, Any]:
        """
        Performs a full analysis of the modpack directory.

        Returns:
            Dict[str, Any]: A dictionary containing the analysis report.
        """
        print(f"Starting analysis of: {self.unzipped_path}")
        
        files = self._list_files()
        modloader_info = self._identify_modloader(files)
        startup_info = self._find_startup_details(files, modloader_info)
        
        self.analysis_report = {
            "modpack_path": self.unzipped_path,
            "modloader_info": modloader_info,
            "startup_info": startup_info,
            "file_manifest": files,
            "template_comparison": self._compare_with_template(modloader_info, startup_info)
        }
        
        print("Analysis complete.")
        return self.analysis_report

    def _list_files(self) -> List[str]:
        """Lists all files in the directory recursively."""
        file_list = []
        for root, _, files in os.walk(self.unzipped_path):
            for file in files:
                # Store relative paths
                file_list.append(os.path.relpath(os.path.join(root, file), self.unzipped_path))
        return file_list

    def _identify_modloader(self, files: List[str]) -> Dict[str, Any]:
        """Identifies the mod loader (Forge, Fabric, etc.) and its version."""
        # Simple regex patterns for identification
        forge_pattern = re.compile(r'forge-([0-9\.]+)-([0-9\.]+)-installer\.jar|forge-([0-9\.]+)-([0-9\.]+)\.jar')
        fabric_pattern = re.compile(r'fabric-server-launch\.jar')
        
        for f in files:
            # Check for Forge
            match = forge_pattern.search(f)
            if match:
                versions = [v for v in match.groups() if v]
                return {
                    "loader": "forge",
                    "minecraft_version": versions[0],
                    "loader_version": versions[1] if len(versions) > 1 else "unknown",
                    "installer_jar": f if "installer" in f else None
                }
        
        # Check for Fabric
        if any(fabric_pattern.search(f) for f in files):
             return {"loader": "fabric", "version": "unknown"}

        return {"loader": "vanilla", "version": "unknown"}

    def _find_startup_details(self, files: List[str], modloader_info: Dict[str, Any]) -> Dict[str, Any]:
        """Finds potential startup JARs and scripts."""
        startup_jar = None
        startup_script = None

        # Common startup script names
        script_names = ['start.sh', 'start.bat', 'server.sh', 'run.sh']
        
        for f in files:
            if f.lower().endswith('.jar'):
                # Prioritize based on modloader info
                if modloader_info.get("loader") == "forge" and "forge" in f:
                    startup_jar = f
                    break
                if modloader_info.get("loader") == "fabric" and "fabric" in f:
                    startup_jar = f
                    break
            if os.path.basename(f).lower() in script_names:
                startup_script = f
        
        # Fallback to any server jar
        if not startup_jar:
            for f in files:
                if 'server' in f.lower() and f.endswith('.jar'):
                    startup_jar = f
                    break

        return {"startup_jar": startup_jar, "startup_script": startup_script}

    def _compare_with_template(self, modloader_info, startup_info) -> Dict[str, Any]:
        """Compares the findings with the loaded template."""
        if not self.template:
            return {"status": "no_template_loaded", "issues": []}
        
        issues = []
        # Example comparison logic
        if self.template.get("expected_modloader") != modloader_info.get("loader"):
            issues.append(f"Mismatched modloader. Template expects '{self.template.get('expected_modloader')}', found '{modloader_info.get('loader')}'.")
        
        if not startup_info.get("startup_jar"):
            issues.append("No startup JAR found, but template likely requires one.")
            
        return {"status": "completed", "issues": issues}

    def save_report(self, output_path: str):
        """
        Saves the analysis report to a JSON file.

        Args:
            output_path (str): The path to save the JSON report file.
        """
        if not self.analysis_report:
            print("Warning: No analysis has been run. Call analyse() first.")
            return

        # Ensure the output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(self.analysis_report, f, indent=4)
        print(f"Analysis report saved to: {output_path}")