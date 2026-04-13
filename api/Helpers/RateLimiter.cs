using System.Collections.Concurrent;

namespace Api.Helpers;

public class RateLimiter
{
    private readonly ConcurrentDictionary<string, List<DateTime>> _requests = new();
    private readonly int _maxRequests;
    private readonly TimeSpan _window;

    public RateLimiter(int maxRequests, TimeSpan window)
    {
        _maxRequests = maxRequests;
        _window = window;
    }

    public bool IsAllowed(string key)
    {
        var now = DateTime.UtcNow;
        var cutoff = now - _window;

        var timestamps = _requests.GetOrAdd(key, _ => new List<DateTime>());

        lock (timestamps)
        {
            timestamps.RemoveAll(t => t < cutoff);

            if (timestamps.Count >= _maxRequests)
                return false;

            timestamps.Add(now);
            return true;
        }
    }
}
