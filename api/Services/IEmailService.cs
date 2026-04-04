using Api.DTOs.Contact;

namespace Api.Services;

public interface IEmailService
{
    Task SendContactEmailAsync(ContactRequest request);
}
