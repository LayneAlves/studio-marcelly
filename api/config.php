<?php
declare(strict_types=1);

/* Configuração local para o MySQL do XAMPP. */
date_default_timezone_set('America/Sao_Paulo');

const DB_HOST = '127.0.0.1';
const DB_PORT = '3306';
const DB_NAME = 'studio_marcelly';
const DB_USER = 'root';
const DB_PASSWORD = '';

function database(): PDO
{
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    return new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
