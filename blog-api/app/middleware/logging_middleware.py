from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from loguru import logger
import time

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        url = request.url.path
        
        logger.info(f"REQUEST  | {method} {url} | client={client_ip}")
        
        response = await call_next(request)
        
        duration = (time.time() - start_time) * 1000 # ms
        status = response.status_code
        
        log_msg = f"RESPONSE | {method} {url} | status={status} | duration={duration:.2f}ms"
        
        if 400 <= status < 500:
            logger.warning(log_msg)
        elif status >= 500:
            logger.error(log_msg)
        else:
            logger.info(log_msg)
            
        return response
