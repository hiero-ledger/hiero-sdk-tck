using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using Hiero.TCK.Config;
using Hiero.TCK.Controller;
using Hiero.TCK.Tests;
using Hiero.TCK.Tests.CryptoService;
using Hiero.TCK.Tests.TokenService;
using Hiero.TCK.Tests.ContractService;
using Hiero.TCK.Tests.FileService;
using Hiero.TCK.Tests.TopicService;
using Hiero.TCK.Tests.ScheduleService;
using Hiero.TCK.Tests.NodeService;

namespace Hiero.TCK
{
    public static class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddSingleton<JsonRpcServiceHandler>();
            builder.Services.AddScoped<SdkService>();
            builder.Services.AddScoped<CryptoService>();
            builder.Services.AddScoped<TokenService>();
            builder.Services.AddScoped<ContractService>();
            builder.Services.AddScoped<FileService>();
            builder.Services.AddScoped<TopicService>();
            builder.Services.AddScoped<ScheduleService>();
            builder.Services.AddScoped<NodeService>();

            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            var app = builder.Build();

            app.UseCors();
            app.UseJsonRpcMiddleware();

            var port = Environment.GetEnvironmentVariable("PORT") ?? "8544";
            app.Run($"http://localhost:{port}");
        }
    }
}