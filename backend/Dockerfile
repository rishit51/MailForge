FROM python:3.12-slim

# Set workdir
WORKDIR /app


# Copy requirements first for caching
COPY req.txt .
RUN pip install --no-cache-dir -r req.txt

# Copy app code
COPY . .
    

# Expose port (though docker-compose overrides)
EXPOSE 8000

# Healthcheck for API
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ping || exit 1

