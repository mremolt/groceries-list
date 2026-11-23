<#import "template.ftl" as layout>
<#-- Expired or used action links (FR-AUTH-05 AC3) get the fixed text and a button to request a new link. -->
<@layout.registrationLayout displayMessage=false; section>
    <#assign expired = (message.summary == msg("expiredActionTokenNoSessionMessage")) || (message.summary == msg("expiredActionTokenSessionExistsMessage")) || (message.summary == msg("expiredActionMessage"))>
    <#if section = "title">${msg("errorTitle")} | ${msg("appName")}
    <#elseif section = "header">${msg("errorTitle")}
    <#elseif section = "form">
        <div id="kc-error-message">
            <p class="lead" role="alert"><span class="error-prefix">${msg("errorPrefix")} </span>${kcSanitize(message.summary)?no_esc}</p>
            <#if traceId??><p class="help" id="traceId">${msg("traceIdSupportMessage", traceId)}</p></#if>
            <div class="actions">
                <#if expired>
                    <a id="new-link" class="btn btn-filled" href="/realms/${realm.name}/login-actions/reset-credentials?client_id=${(client.clientId)!'groceries-bff'}">${msg("doRequestNewLink")}</a>
                <#elseif client?? && client.baseUrl?has_content>
                    <a id="backToApplication" class="btn btn-filled" href="${client.baseUrl}">${msg("backToApplication")}</a>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
