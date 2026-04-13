namespace Api.Exceptions;

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message = "Authentication required.") : base(message) { }
}
