from __future__ import annotations

import logging
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config

from .config import get_settings

logger = logging.getLogger(__name__)

class MinioHelper:
    _instance: MinioHelper | None = None

    def __init__(self):
        settings = get_settings()
        self.bucket = settings.minio_bucket
        
        try:
            self.s3 = boto3.client(
                's3',
                endpoint_url=settings.minio_url,
                aws_access_key_id=settings.minio_access_key,
                aws_secret_access_key=settings.minio_secret_key,
                config=Config(signature_version='s3v4'),
                region_name='us-east-1'
            )
            
            # Ensure bucket exists
            try:
                self.s3.head_bucket(Bucket=self.bucket)
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code')
                if error_code == '404':
                    self.s3.create_bucket(Bucket=self.bucket)
                    logger.info(f"Created MinIO bucket: {self.bucket}")
                else:
                    logger.error(f"Error checking bucket: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")
            self.s3 = None

    @classmethod
    def get(cls) -> MinioHelper:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def upload_file(self, file_bytes: bytes, object_name: str, content_type: str = "application/pdf") -> str | None:
        if not self.s3:
            return None
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=object_name,
                Body=file_bytes,
                ContentType=content_type
            )
            return object_name
        except Exception as e:
            logger.error(f"MinIO upload error: {e}")
            return None

    def get_presigned_url(self, object_name: str, expires_in: int = 3600) -> str | None:
        if not self.s3:
            return None
        try:
            url = self.s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': self.bucket, 'Key': object_name},
                ExpiresIn=expires_in
            )
            # Replace minio:9000 with localhost:9090 for local browser access
            return url.replace("minio:9000", "localhost:9090")
        except Exception as e:
            logger.error(f"MinIO presigned url error: {e}")
            return None

    def delete_file(self, object_name: str) -> bool:
        if not self.s3:
            return False
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=object_name)
            return True
        except Exception as e:
            logger.error(f"MinIO delete error: {e}")
            return False
