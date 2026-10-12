import threading, time


class ExpiringRegistry:
    def __init__(self, ttl_seconds=3600, max_items=1000):
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self._items = {}
        self._lock = threading.RLock()

    def __getitem__(self, key):
        with self._lock:
            self._items[key]["last_access"] = time.monotonic()
            return self._items[key]

    def __setitem__(self, key, value):
        with self._lock:
            value.setdefault("created_at", time.monotonic())
            value["last_access"] = time.monotonic()
            self._items[key] = value
            self.cleanup()

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def pop(self, key, default=None):
        with self._lock:
            return self._items.pop(key, default)

    def cleanup(self, finalizer=None):
        with self._lock:
            now = time.monotonic()
            keys = [
                k
                for k, v in self._items.items()
                if now - v.get("last_access", now) > self.ttl_seconds
            ]
            extra = max(0, len(self._items) - self.max_items)
            keys += sorted(
                (k for k in self._items if k not in keys),
                key=lambda k: self._items[k]["last_access"],
            )[:extra]
            for k in dict.fromkeys(keys):
                v = self._items.pop(k, None)
                if v is not None and finalizer:
                    try:
                        finalizer(v)
                    except Exception:
                        pass
            return len(keys)

    def snapshot(self):
        with self._lock:
            return dict(self._items)
