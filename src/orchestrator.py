"""
Download -> Process -> Analyze -> Create Egg Config
"""
import os
import shutil
import tempfile
from .modpack_downloader import ModpackDownloader
from .zip_processor import ZipProcessor
from .modpack_analyser import ModpackAnalyser
from .egg_config_creator import EggConfigCreator

class Orchestrator:
    """
    Manages the end-to-end process of downloading a modpack, analyzing it,
    and creating a Pterodactyl egg configuration.
    """

    def __init__(self, download_path="assets/packs", output_path="generated_eggs"):
        """
        Initializes the Orchestrator.

        Args:
            download_path (str): Directory to store downloaded modpacks.
            output_path (str): Directory to save the final egg configurations.
        """
        self.download_path = download_path
        self.output_path = output_path
        self.downloader = ModpackDownloader(download_path=self.download_path)
        
        os.makedirs(self.output_path, exist_ok=True)

    def process_modpack_from_url(self, url: str):
        """
        Runs the full pipeline for a single modpack URL.

        Args:
            url (str): The direct download URL for the modpack zip file.
        """
        temp_unzip_dir = None
        try:
            # 1. Download
            print(f"Step 1: Downloading modpack from {url}")
            filename = self.downloader.add_to_queue(url)
            
            # Wait for download to complete
            # In a real app, this would be handled more gracefully (e.g., with callbacks or polling)
            while self.downloader.is_downloading():
                status = self.downloader.get_current_download_status()
                if status:
                    progress = status.get('progress', 0)
                    print(f"Downloading... {progress:.2f}%", end='\r')
                import time
                time.sleep(0.5)
            print("\nDownload complete.")
            
            zip_path = os.path.join(self.download_path, filename)
            if not os.path.exists(zip_path):
                 raise FileNotFoundError(f"Downloaded file not found: {zip_path}")

            # 2. Process (Unzip)
            print(f"\nStep 2: Processing (unzipping) {filename}")
            processor = ZipProcessor(zip_path)
            temp_unzip_dir = processor.extract()
            print(f"Unzipped to temporary directory: {temp_unzip_dir}")

            # 3. Analyze
            print("\nStep 3: Analyzing modpack contents")
            analyser = ModpackAnalyser(unzipped_path=temp_unzip_dir)
            analysis_report = analyser.analyse()
            
            # Optional: Save the analysis report for debugging
            report_path = os.path.join(self.output_path, f"{os.path.splitext(filename)[0]}_analysis.json")
            analyser.save_report(report_path)
            print(f"Analysis report saved to {report_path}")

            # 4. Create Egg Config
            print("\nStep 4: Creating Pterodactyl Egg configuration")
            creator = EggConfigCreator(analysis_report=analysis_report)
            egg_filename = f"{os.path.splitext(filename)[0]}_egg.json"
            egg_output_path = os.path.join(self.output_path, egg_filename)
            creator.save_egg_config(egg_output_path)
            
            print(f"\nSuccess! Egg configuration created at: {egg_output_path}")

        except Exception as e:
            print(f"\nAn error occurred during orchestration: {e}")
        finally:
            # 5. Cleanup
            if temp_unzip_dir and os.path.exists(temp_unzip_dir):
                print(f"Cleaning up temporary directory: {temp_unzip_dir}")
                shutil.rmtree(temp_unzip_dir)
