import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateApiKeyDto {
    @IsString()
    name: string;

    @IsArray()
    scopes: string[]; // e.g., ['candidates.read','candidates.write']
}

export class RevokeApiKeyDto {
    @IsString()
    id: string;
}
