namespace Api.Exceptions;

public class AppValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }

    public AppValidationException(Dictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public AppValidationException(string field, string error)
        : base(error)
    {
        Errors = new Dictionary<string, string[]> { [field] = [error] };
    }
}
