import os
import queue
import threading
import requests
from urllib.parse import urlparse

class ModpackDownloader:
    """
    A class to download modpacks from direct URLs with a queueing system.
    """
    def __init__(self, download_path='assets/packs'):
        """
        Initializes the ModpackDownloader.

        Args:
            download_path (str): The directory to save downloaded files.
                                 Defaults to 'assets/packs'.
        """
        self.download_path = download_path
        if not os.path.exists(self.download_path):
            os.makedirs(self.download_path)

        self.download_queue = queue.Queue()
        self.current_download_info = {}
        self.lock = threading.Lock()

        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def _worker(self):
        """The worker thread that processes the download queue."""
        while True:
            url, filename = self.download_queue.get()
            self._update_status(filename, 'starting', 0)
            try:
                self._download_file(url, filename)
                self._update_status(filename, 'completed', 100)
            except Exception as e:
                self._update_status(filename, 'failed', error=str(e))
            finally:
                self.download_queue.task_done()

    def _download_file(self, url, filename):
        """Downloads a single file and updates its progress."""
        filepath = os.path.join(self.download_path, filename)
        self._update_status(filename, 'downloading')
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            total_size = int(r.headers.get('content-length', 0))
            downloaded_size = 0
            with open(filepath, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        progress = (downloaded_size / total_size) * 100
                        self._update_status(filename, 'downloading', progress)

    def _update_status(self, filename, status, progress=None, error=None):
        """Thread-safe method to update the download status."""
        with self.lock:
            info = {'status': status}
            if progress is not None:
                info['progress'] = progress
            if error is not None:
                info['error'] = error
            self.current_download_info = info

    def add_to_queue(self, url: str, filename: str = None):
        """
        Adds a new download to the queue.

        Args:
            url (str): The direct download URL for the zip file.
            filename (str, optional): The name to save the file as. 
                                      If None, it's extracted from the URL.
        
        Returns:
            str: The filename of the queued download.
        """
        if not filename:
            path = urlparse(url).path
            filename = os.path.basename(path)
            if not filename:
                raise ValueError("Could not determine filename from URL.")

        self.download_queue.put((url, filename))
        return filename

    def get_queue_status(self):
        """
        Gets the number of items remaining in the download queue.

        Returns:
            int: The number of downloads waiting in the queue.
        """
        return self.download_queue.qsize()

    def get_current_download_status(self):
        """
        Gets the status of the currently active download.

        Returns:
            dict: A dictionary with status info (status, progress, error),
                  or None if no download is active.
        """
        with self.lock:
            if not self.is_downloading():
                return None
            return self.current_download_info.copy()

    def is_downloading(self):
        """
        Checks if there is an active or queued download.

        Returns:
            bool: True if a download is in progress or queued, False otherwise.
        """
        return self.download_queue.unfinished_tasks > 0
