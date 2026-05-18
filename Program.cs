using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using Hedera.Hashgraph.TCK.Config;
using Hedera.Hashgraph.TCK.Controller;
using Hedera.Hashgraph.TCK.Tests;
using Hedera.Hashgraph.TCK.Tests.CryptoService;
using Hedera.Hashgraph.TCK.Tests.TokenService;
using Hedera.Hashgraph.TCK.Tests.ContractService;
using Hedera.Hashgraph.TCK.Tests.FileService;
using Hedera.Hashgraph.TCK.Tests.TopicService;
using Hedera.Hashgraph.TCK.Tests.ScheduleService;
using Hedera.Hashgraph.TCK.Tests.NodeService;

namespace Hedera.Hashgraph.TCK
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