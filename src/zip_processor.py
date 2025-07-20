"""
Downloaded Zip -> Unzip into temp folder -> With live console stream / status updates -> Unzipped Dir in temp folder
"""
import zipfile
import os
import tempfile
import threading
from typing import Callable, Optional

class ZipProcessor:
    """
    Extracts a zip file to a temporary directory and provides progress updates.
    """

    def __init__(self, zip_path: str):
        """
        Initializes the ZipProcessor.

        Args:
            zip_path (str): The path to the zip file.
        """
        if not os.path.exists(zip_path):
            raise FileNotFoundError(f"Zip file not found at: {zip_path}")
        self.zip_path = zip_path
        self.temp_dir = None
        self.status = "idle"
        self.progress = 0
        self.error = None

    def _update_status(self, status: str, progress: float = 0, error: Optional[str] = None):
        """Updates the processing status."""
        self.status = status
        self.progress = progress
        self.error = error
        print(f"Status: {status}, Progress: {progress:.2f}%")
        if error:
            print(f"Error: {error}")

    def extract(self, progress_callback: Optional[Callable[[float], None]] = None) -> str:
        """
        Extracts the zip file to a new temporary directory.

        Args:
            progress_callback (Optional[Callable[[float], None]]): A callback function
                to receive progress updates (0.0 to 100.0).

        Returns:
            str: The path to the temporary directory where files were extracted.
        """
        self.temp_dir = tempfile.mkdtemp(prefix="pterodeploy_")
        self._update_status("starting", 0)

        try:
            with zipfile.ZipFile(self.zip_path, 'r') as zip_ref:
                file_list = zip_ref.infolist()
                total_files = len(file_list)
                extracted_files = 0

                self._update_status("extracting", 0)

                for file in file_list:
                    zip_ref.extract(file, self.temp_dir)
                    extracted_files += 1
                    progress = (extracted_files / total_files) * 100
                    self.progress = progress
                    if progress_callback:
                        progress_callback(progress)
                    # To avoid too many prints, we can update status less frequently
                    if extracted_files % 10 == 0 or extracted_files == total_files:
                         self._update_status("extracting", progress)


            self._update_status("completed", 100)
            print(f"Successfully extracted to {self.temp_dir}")
            return self.temp_dir
        except Exception as e:
            self._update_status("failed", self.progress, str(e))
            # Clean up the temp directory on failure
            if self.temp_dir:
                import shutil
                shutil.rmtree(self.temp_dir)
            raise e

    def get_status(self):
        """
        Gets the current status of the extraction process.

        Returns:
            dict: A dictionary with status info (status, progress, error).
        """
        return {
            "status": self.status,
            "progress": self.progress,
            "error": self.error,
            "temp_dir": self.temp_dir
        }
